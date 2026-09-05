"""Unit tests for IMD JWT auth, caching, dual-header requests, and weather normalization."""
from __future__ import annotations

import json
import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.http_client import UpstreamAPIError
from app.services import imd


class _FakeResponse:
    def __init__(self, status_code: int, payload: Any = None, text: str | None = None):
        self.status_code = status_code
        self._payload = payload
        if text is not None:
            self.text = text
        elif payload is None:
            self.text = ""
        else:
            self.text = json.dumps(payload)

    def json(self) -> Any:
        if isinstance(self._payload, Exception):
            raise self._payload
        if self._payload is None:
            raise ValueError("no json")
        return self._payload


@pytest.fixture(autouse=True)
def _reset_imd_state(monkeypatch):
    imd.clear_cached_jwt()
    imd._mapping_cache._store.clear()
    imd._obs_cache._store.clear()
    monkeypatch.setattr(imd.settings, "imd_api_key", "test-api-key")
    monkeypatch.setattr(imd.settings, "imd_email", "user@example.com")
    monkeypatch.setattr(imd.settings, "imd_password", "test-password")
    monkeypatch.setattr(imd.settings, "imd_base_url", "https://api.imd.gov.in/api/v1")
    monkeypatch.setattr(imd.settings, "imd_oauth_token_url", "https://api.imd.gov.in/api/oauth/token.php")
    yield
    imd.clear_cached_jwt()


@pytest.mark.asyncio
async def test_jwt_generation_parses_access_token(monkeypatch):
    client = MagicMock()
    client.post = AsyncMock(
        return_value=_FakeResponse(
            200,
            {"access_token": "jwt-abc", "token_type": "Bearer", "expires_in": 3600},
        )
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    token = await imd.get_access_token()
    assert token == "jwt-abc"
    client.post.assert_awaited_once()
    args, kwargs = client.post.await_args
    assert args[0] == "https://api.imd.gov.in/api/oauth/token.php"
    assert kwargs["json"] == {"email": "user@example.com", "password": "test-password"}


@pytest.mark.asyncio
async def test_jwt_is_cached_until_near_expiry(monkeypatch):
    client = MagicMock()
    client.post = AsyncMock(
        return_value=_FakeResponse(
            200,
            {"access_token": "jwt-cached", "token_type": "Bearer", "expires_in": 3600},
        )
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    t1 = await imd.get_access_token()
    t2 = await imd.get_access_token()
    assert t1 == t2 == "jwt-cached"
    assert client.post.await_count == 1


@pytest.mark.asyncio
async def test_jwt_refresh_before_expiry_skew(monkeypatch):
    client = MagicMock()
    client.post = AsyncMock(
        side_effect=[
            _FakeResponse(200, {"access_token": "jwt-1", "expires_in": 3600}),
            _FakeResponse(200, {"access_token": "jwt-2", "expires_in": 3600}),
        ]
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    await imd.get_access_token()
    # Force near-expiry by setting deadline just ahead of now within skew window.
    imd._token_expires_at = imd.time.time() + 30
    token = await imd.get_access_token()
    assert token == "jwt-2"
    assert client.post.await_count == 2


@pytest.mark.asyncio
async def test_auth_headers_include_both_x_api_key_and_bearer(monkeypatch):
    monkeypatch.setattr(imd, "get_access_token", AsyncMock(return_value="jwt-xyz"))
    headers = await imd._auth_headers()
    assert headers["X-API-KEY"] == "test-api-key"
    assert headers["Authorization"] == "Bearer jwt-xyz"
    assert "jwt-xyz" in headers["Authorization"]


@pytest.mark.asyncio
async def test_imd_get_retries_once_on_401(monkeypatch):
    get_calls: list[dict[str, str]] = []

    async def fake_get(url, params=None, headers=None):
        get_calls.append(dict(headers or {}))
        if len(get_calls) == 1:
            return _FakeResponse(401, {"error": "Invalid or expired JWT token"})
        return _FakeResponse(200, [{"Station_Code": "42182", "Latitude": "28.6", "Longitude": "77.2"}])

    client = MagicMock()
    client.get = AsyncMock(side_effect=fake_get)
    client.post = AsyncMock(
        return_value=_FakeResponse(200, {"access_token": "jwt-fresh", "expires_in": 3600})
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    # Seed an old token so first request uses it, then 401 forces refresh.
    imd._cached_access_token = "jwt-old"
    imd._token_expires_at = imd.time.time() + 3600

    payload = await imd._imd_get("cityforecastloc")
    assert isinstance(payload, list)
    assert len(get_calls) == 2
    assert get_calls[0]["Authorization"] == "Bearer jwt-old"
    assert get_calls[1]["Authorization"] == "Bearer jwt-fresh"
    assert get_calls[0]["X-API-KEY"] == "test-api-key"
    assert get_calls[1]["X-API-KEY"] == "test-api-key"


@pytest.mark.asyncio
async def test_imd_get_does_not_loop_after_failed_retry(monkeypatch):
    async def always_401(url, params=None, headers=None):
        return _FakeResponse(401, {"error": "still bad"})

    client = MagicMock()
    client.get = AsyncMock(side_effect=always_401)
    client.post = AsyncMock(
        return_value=_FakeResponse(200, {"access_token": "jwt-fresh", "expires_in": 3600})
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)
    imd._cached_access_token = "jwt-old"
    imd._token_expires_at = imd.time.time() + 3600

    with pytest.raises(UpstreamAPIError) as excinfo:
        await imd._imd_get("current_wx", params={"id": "42182"})
    assert "401" in excinfo.value.message
    assert client.get.await_count == 2  # original + one retry only


def test_nearest_station_selection_haversine():
    # Greater Noida-ish point should prefer Delhi-ish station over Mumbai.
    stations = [
        {"id": "43003", "name": "Mumbai", "lat": 19.076, "lon": 72.877},
        {"id": "42182", "name": "Delhi", "lat": 28.589, "lon": 77.222},
    ]
    lat, lon = 28.4744, 77.5040
    best = min(stations, key=lambda s: imd._haversine_km(lat, lon, s["lat"], s["lon"]))
    assert best["id"] == "42182"
    assert imd._haversine_km(lat, lon, best["lat"], best["lon"]) < imd._MAX_STATION_DISTANCE_KM


def test_normalize_current_weather_response_contract():
    row = {
        "Station Id": "42182",
        "Station": "DELHI",
        "Temperature": "32.5",
        "Humidity": "41",
        "Wind Speed": "12",
        "Wind Direction": "90",
        "M.S.L.P": "1008.2",
        "Weather Code": "61",
        "Last 24 hrs Rainfall": "0",
        "Date of Observation": "2026-09-05",
        "Time of Observation": "12:00",
    }
    result = imd._normalize_current(row, 28.47, 77.50, "Greater Noida", "DELHI")
    assert result.source == "imd"
    assert result.is_demo is False
    assert result.current.temperature == 32.5
    assert result.current.condition_group == "rain"
    assert result.location.name == "Greater Noida"


def test_redact_strips_secrets_from_logs():
    sample = "Authorization: Bearer supersecret api_key=abc123 password=pw email=a@b.c"
    redacted = imd._redact(sample)
    assert "supersecret" not in redacted
    assert "abc123" not in redacted
    assert "pw" not in redacted
    assert "a@b.c" not in redacted
    assert "[REDACTED]" in redacted


@pytest.mark.asyncio
async def test_failed_jwt_raises_safe_error(monkeypatch, caplog):
    client = MagicMock()
    client.post = AsyncMock(return_value=_FakeResponse(401, {"error": "bad login"}, text='{"error":"bad login"}'))
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    with caplog.at_level(logging.WARNING):
        with pytest.raises(UpstreamAPIError) as excinfo:
            await imd.get_access_token()
    assert "JWT" in excinfo.value.message
    joined = " ".join(r.message for r in caplog.records)
    assert "test-password" not in joined
    assert "user@example.com" not in joined or "email=[REDACTED]" in joined or "email" not in joined.lower()
