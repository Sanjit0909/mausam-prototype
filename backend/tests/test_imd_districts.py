"""Unit tests for IMD district warning/nowcast integration and district ID resolution."""
from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.http_client import UpstreamAPIError
from app.services import imd
from app.services import imd_districts as districts


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


SAMPLE_CATALOG = [
    {"Obj_id": "101", "District": "NEW DELHI", "State": "DELHI"},
    {"Obj_id": "202", "District": "PUNE", "State": "MAHARASHTRA"},
    {"Obj_id": "303", "District": "BENGALURU URBAN", "State": "KARNATAKA"},
]


@pytest.fixture(autouse=True)
def _reset_state(monkeypatch):
    imd.clear_cached_jwt()
    imd._mapping_cache._store.clear()
    imd._obs_cache._store.clear()
    districts._catalog_cache._store.clear()
    districts._district_obs_cache._store.clear()
    monkeypatch.setattr(imd.settings, "imd_api_key", "test-api-key")
    monkeypatch.setattr(imd.settings, "imd_email", "user@example.com")
    monkeypatch.setattr(imd.settings, "imd_password", "test-password")
    monkeypatch.setattr(imd.settings, "imd_base_url", "https://api.imd.gov.in/api/v1")
    monkeypatch.setattr(imd.settings, "imd_oauth_token_url", "https://api.imd.gov.in/api/oauth/token.php")
    yield
    imd.clear_cached_jwt()
    districts._catalog_cache._store.clear()
    districts._district_obs_cache._store.clear()


def test_match_district_exact_and_normalized():
    catalog = [{"id": "101", "name": "NEW DELHI", "state": "DELHI"}]
    assert districts.match_district_in_catalog(catalog, "New Delhi")["id"] == "101"
    assert districts.match_district_in_catalog(catalog, "NEW DELHI DISTRICT")["id"] == "101"


def test_match_district_uses_state_disambiguation():
    catalog = [
        {"id": "1", "name": "AURANGABAD", "state": "MAHARASHTRA"},
        {"id": "2", "name": "AURANGABAD", "state": "BIHAR"},
    ]
    hit = districts.match_district_in_catalog(catalog, "Aurangabad", state_name="Bihar")
    assert hit is not None
    assert hit["id"] == "2"


def test_match_district_ambiguous_without_state_returns_none():
    catalog = [
        {"id": "1", "name": "AURANGABAD", "state": "MAHARASHTRA"},
        {"id": "2", "name": "AURANGABAD", "state": "BIHAR"},
    ]
    assert districts.match_district_in_catalog(catalog, "Aurangabad") is None


def test_match_district_never_invents_id():
    catalog = [{"id": "101", "name": "NEW DELHI", "state": "DELHI"}]
    assert districts.match_district_in_catalog(catalog, "Totally Fake District") is None
    assert districts.match_district_in_catalog(catalog, None, city_name=None) is None


def test_parse_district_warning_day1_to_day5_and_colors():
    row = {
        "Obj_id": "101",
        "District": "NEW DELHI",
        "Date": "2026-09-05",
        "UTC": "06:30:00",
        "Day_1": "9",
        "Day1_Color": "2",
        "Day_2": "1",
        "Day2_Color": "4",
        "Day_3": "2,16",
        "Day3_Color": "1",
        "Day_4": "1",
        "Day4_Color": "4",
        "Day_5": "15",
        "Day5_Color": "3",
    }
    alerts = districts.parse_district_warning_row(row)
    assert len(alerts) == 3  # days 1, 3, 5 (day 2/4 are No Warning)
    by_day = {a.id: a for a in alerts}
    d1 = by_day["imd-warning-101-day1-9"]
    assert d1.source == "IMD"
    assert d1.severity == "severe"  # color 2 = Orange
    assert d1.alert_type == "heat"
    assert "Heat Wave" in d1.title
    assert d1.area == "NEW DELHI"
    assert d1.issued_at.startswith("2026-09-05")

    d3 = by_day["imd-warning-101-day3-2-16"]
    assert d3.severity == "extreme"  # color 1 = Red for warnings
    assert "Heavy Rain" in d3.title

    d5 = by_day["imd-warning-101-day5-15"]
    assert d5.severity == "moderate"  # color 3 = Yellow
    assert d5.alert_type == "fog"


def test_parse_district_warning_all_no_warning_yields_empty():
    row = {
        "Obj_id": "101",
        "District": "NEW DELHI",
        "Date": "2026-09-05",
        "Day_1": "1",
        "Day1_Color": "4",
        "Day_2": "1",
        "Day2_Color": "4",
        "Day_3": "1",
        "Day3_Color": "4",
        "Day_4": "1",
        "Day4_Color": "4",
        "Day_5": "1",
        "Day5_Color": "4",
    }
    assert districts.parse_district_warning_row(row) == []


def test_parse_malformed_empty_warning_row():
    assert districts.parse_district_warning_row({}) == []
    assert districts.parse_district_warning_row({"Obj_id": "1", "District": "X"}) == []


def test_parse_district_nowcast_color_severity():
    row = {
        "Station": "NEW DELHI",
        "Date": "2026-09-05",
        "toi": "1430",
        "color": "4",
        "message": "Heavy rain: > 15 mm/hr",
        "Vupto": "17:00",
    }
    alerts = districts.parse_district_nowcast_row(row, "101", "NEW DELHI")
    assert len(alerts) == 1
    a = alerts[0]
    assert a.source == "IMD"
    assert a.severity == "extreme"  # nowcast color 4 = Red
    assert a.alert_type == "rain"
    assert "Valid up to 17:00" in a.description
    assert a.provider_label == "IMD - District Nowcast"


def test_parse_district_nowcast_green_no_weather_empty():
    row = {"Station": "PUNE", "color": "1", "message": "No Weather", "Date": "2026-09-05"}
    assert districts.parse_district_nowcast_row(row, "202", "PUNE") == []


def test_no_fake_imd_warning_from_empty_payload():
    assert districts.parse_district_warning_row({"Day_1": "", "Day_2": None}) == []
    assert districts.parse_district_nowcast_row({"color": "1"}, "1", "X") == []


@pytest.mark.asyncio
async def test_fetch_unmapped_district_status(monkeypatch):
    async def fake_catalog():
        return [{"id": "101", "name": "NEW DELHI", "state": "DELHI"}]

    async def fake_place(lat, lon):
        return {"district": "Nowhereville", "state": "Atlantis", "city": None, "country": "India"}

    monkeypatch.setattr(districts, "_load_district_catalog", fake_catalog)
    monkeypatch.setattr(districts.geocoding, "resolve_india_district", fake_place)

    result = await districts.fetch_district_alerts(28.6, 77.2)
    assert result.status == "unmapped_district"
    assert result.alerts == []
    assert result.district_id is None


@pytest.mark.asyncio
async def test_fetch_ok_no_active_vs_unavailable(monkeypatch):
    async def fake_catalog():
        return [{"id": "101", "name": "NEW DELHI", "state": "DELHI"}]

    async def fake_place(lat, lon):
        return {"district": "New Delhi", "state": "Delhi", "city": "New Delhi", "country": "India"}

    monkeypatch.setattr(districts, "_load_district_catalog", fake_catalog)
    monkeypatch.setattr(districts.geocoding, "resolve_india_district", fake_place)

    async def ok_get(path, params=None):
        if path == "districtwarning":
            return [
                {
                    "Obj_id": "101",
                    "District": "NEW DELHI",
                    "Date": "2026-09-05",
                    "Day_1": "1",
                    "Day1_Color": "4",
                    "Day_2": "1",
                    "Day2_Color": "4",
                    "Day_3": "1",
                    "Day3_Color": "4",
                    "Day_4": "1",
                    "Day4_Color": "4",
                    "Day_5": "1",
                    "Day5_Color": "4",
                }
            ]
        if path == "districtnowcast":
            return [{"Station": "NEW DELHI", "color": "1", "message": "No Weather", "Date": "2026-09-05"}]
        raise AssertionError(path)

    monkeypatch.setattr(districts, "_imd_get", ok_get)
    result = await districts.fetch_district_alerts(28.61, 77.21)
    assert result.status == "ok_no_active"
    assert result.alerts == []
    assert result.district_id == "101"

    districts._district_obs_cache._store.clear()

    async def fail_get(path, params=None):
        raise UpstreamAPIError("imd", "down")

    monkeypatch.setattr(districts, "_imd_get", fail_get)
    unavailable = await districts.fetch_district_alerts(28.62, 77.22)
    assert unavailable.status == "unavailable"
    assert unavailable.alerts == []


@pytest.mark.asyncio
async def test_fetch_valid_warning_and_nowcast(monkeypatch):
    async def fake_catalog():
        return [{"id": "101", "name": "NEW DELHI", "state": "DELHI"}]

    async def fake_place(lat, lon):
        return {"district": "New Delhi", "state": "Delhi", "city": "Delhi", "country": "India"}

    monkeypatch.setattr(districts, "_load_district_catalog", fake_catalog)
    monkeypatch.setattr(districts.geocoding, "resolve_india_district", fake_place)

    async def ok_get(path, params=None):
        assert params == {"id": "101"}
        if path == "districtwarning":
            return [
                {
                    "Obj_id": "101",
                    "District": "NEW DELHI",
                    "Date": "2026-09-05",
                    "UTC": "08:00:00",
                    "Day_1": "4",
                    "Day1_Color": "2",
                    "Day_2": "1",
                    "Day2_Color": "4",
                    "Day_3": "1",
                    "Day3_Color": "4",
                    "Day_4": "1",
                    "Day4_Color": "4",
                    "Day_5": "1",
                    "Day5_Color": "4",
                }
            ]
        if path == "districtnowcast":
            return [
                {
                    "Station": "NEW DELHI",
                    "Date": "2026-09-05",
                    "toi": "1500",
                    "color": "3",
                    "message": "Moderate Thunderstorms (gusts 41-61 kmph)",
                }
            ]
        raise AssertionError(path)

    monkeypatch.setattr(districts, "_imd_get", ok_get)
    result = await districts.fetch_district_alerts(28.61, 77.21)
    assert result.status == "ok"
    assert result.district_id == "101"
    assert len(result.alerts) == 2
    assert all(a.source == "IMD" for a in result.alerts)
    severities = {a.severity for a in result.alerts}
    assert "severe" in severities  # warning orange + nowcast orange


@pytest.mark.asyncio
async def test_catalog_loads_from_imd_districtwarning(monkeypatch):
    async def fake_imd_get(path, params=None):
        assert path == "districtwarning"
        assert params is None
        return SAMPLE_CATALOG

    monkeypatch.setattr(districts, "_imd_get", fake_imd_get)
    catalog = await districts._load_district_catalog()
    assert len(catalog) == 3
    assert catalog[0]["id"] == "101"
    assert all("id" in e and "name" in e for e in catalog)


@pytest.mark.asyncio
async def test_imd_401_refresh_retry_used_by_district_get(monkeypatch):
    """District endpoints reuse _imd_get: 401 → JWT refresh → single retry."""
    imd.clear_cached_jwt()
    client = MagicMock()
    client.post = AsyncMock(
        side_effect=[
            _FakeResponse(200, {"access_token": "jwt-1", "expires_in": 3600}),
            _FakeResponse(200, {"access_token": "jwt-2", "expires_in": 3600}),
        ]
    )
    client.get = AsyncMock(
        side_effect=[
            _FakeResponse(401, {"error": "expired"}),
            _FakeResponse(200, [{"Obj_id": "101", "District": "NEW DELHI", "Day_1": "1", "Day1_Color": "4"}]),
        ]
    )
    monkeypatch.setattr(imd, "get_http_client", lambda: client)

    payload = await imd._imd_get("districtwarning", params={"id": "101"})
    assert isinstance(payload, list)
    assert client.get.await_count == 2
    assert client.post.await_count == 2  # initial + refresh after 401


@pytest.mark.asyncio
async def test_not_configured_returns_empty_not_fake(monkeypatch):
    monkeypatch.setattr(imd.settings, "imd_api_key", "")
    monkeypatch.setattr(imd.settings, "imd_email", "")
    monkeypatch.setattr(imd.settings, "imd_password", "")
    result = await districts.fetch_district_alerts(28.6, 77.2)
    assert result.status == "not_configured"
    assert result.alerts == []
