"""IMD (India Meteorological Department) provider - authoritative Indian weather source.

Official reference: https://api.imd.gov.in/public/api_reference.html

Verified auth (IMD portal / live Azure tests):
  X-API-KEY: <IMD_API_KEY>
  Authorization: Bearer <JWT from POST https://api.imd.gov.in/api/oauth/token.php>

Current-weather flow for /api/weather (lat, lon, name):
1. Load `cityforecastloc` (coordinates + Station_Name / Station_Code).
2. Load bulk `current_wx` (valid observation Station Id + Station name; no lat/lon).
3. Join only on exact normalized station names (no fuzzy match; no invented IDs).
4. Pick nearest *verified* station by haversine.
5. Fetch `current_wx?id=<verified Station Id>`.

Never logs API keys, passwords, JWTs, or Authorization headers.
"""
from __future__ import annotations

import asyncio
import logging
import math
import re
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from ..config import settings
from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_http_client
from ..models.alerts import WeatherAlert
from ..models.common import LocationInfo
from ..models.weather import CurrentWeather, WeatherResponse

logger = logging.getLogger(__name__)

# Station coordinates change rarely; cache mapping longer than weather observations.
_mapping_cache = TTLCache(ttl_seconds=6 * 60 * 60)
_obs_cache = TTLCache(ttl_seconds=10 * 60)

# Reject nearest-station matches farther than this.
_MAX_STATION_DISTANCE_KM = 150.0

# Refresh JWT this many seconds before expires_in elapses.
_JWT_REFRESH_SKEW_SECONDS = 60.0

_SECRET_RE_BEARER = re.compile(r"(?i)\bBearer\s+\S+")
_SECRET_RE_AUTHZ = re.compile(r"(?i)Authorization\s*:\s*.+?(?=(?:\s+(?:api[_-]?key|password|email)\b)|$)")
_SECRET_RE_KV = re.compile(r"(?i)\b(api[_-]?key|access[_-]?token|password|email)\s*[:=]\s*\S+")

# In-memory JWT cache (process-local).
_token_lock = asyncio.Lock()
_cached_access_token: str | None = None
_token_expires_at: float = 0.0  # time.time() deadline


def is_configured() -> bool:
    return settings.has_imd_credentials


def _base_url() -> str:
    return settings.imd_base_url.rstrip("/")


def _oauth_token_url() -> str:
    # Must NOT be derived by appending to IMD_BASE_URL (/api/v1).
    return (settings.imd_oauth_token_url or "https://api.imd.gov.in/api/oauth/token.php").strip()


def _redact(text: str, limit: int = 300) -> str:
    cleaned = text or ""
    cleaned = _SECRET_RE_BEARER.sub("Bearer [REDACTED]", cleaned)
    cleaned = _SECRET_RE_AUTHZ.sub("Authorization: [REDACTED]", cleaned)
    cleaned = _SECRET_RE_KV.sub(r"\1=[REDACTED]", cleaned)
    return cleaned[:limit]


def _safe_exc_message(exc: BaseException) -> str:
    """Never surface secrets if an upstream library embeds request details."""
    return _redact(str(exc), limit=200)


def clear_cached_jwt() -> None:
    """Invalidate cached JWT (tests / forced refresh)."""
    global _cached_access_token, _token_expires_at
    _cached_access_token = None
    _token_expires_at = 0.0


def _jwt_is_fresh(now: float | None = None) -> bool:
    now = time.time() if now is None else now
    return bool(_cached_access_token) and now < (_token_expires_at - _JWT_REFRESH_SKEW_SECONDS)


async def _fetch_jwt() -> str:
    """POST oauth/token.php with email/password; returns access_token. Never logs secrets."""
    global _cached_access_token, _token_expires_at

    email = settings.imd_email.strip()
    password = settings.imd_password.strip()
    if not email or not password:
        raise UpstreamAPIError("imd", "IMD JWT credentials not configured")

    client = get_http_client()
    url = _oauth_token_url()
    try:
        resp = await client.post(
            url,
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
        )
    except httpx.TimeoutException as exc:
        logger.warning("[IMD] JWT request timed out error=%s", type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD JWT request timed out") from exc
    except httpx.HTTPError as exc:
        logger.warning("[IMD] JWT transport error=%s", type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD JWT request failed") from exc

    if resp.status_code >= 400:
        logger.warning("[IMD] JWT HTTP %s body=%s", resp.status_code, _redact(resp.text))
        raise UpstreamAPIError("imd", f"IMD JWT HTTP {resp.status_code}")

    try:
        payload = resp.json()
    except ValueError as exc:
        logger.warning("[IMD] JWT invalid JSON body=%s", _redact(resp.text))
        raise UpstreamAPIError("imd", "IMD JWT returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise UpstreamAPIError("imd", "IMD JWT response unexpected shape")

    token = payload.get("access_token")
    if not token or not isinstance(token, str):
        raise UpstreamAPIError("imd", "IMD JWT response missing access_token")

    expires_in = payload.get("expires_in", 3600)
    try:
        expires_in_f = float(expires_in)
    except (TypeError, ValueError):
        expires_in_f = 3600.0
    if expires_in_f <= 0:
        expires_in_f = 3600.0

    _cached_access_token = token.strip()
    _token_expires_at = time.time() + expires_in_f
    logger.info("[IMD] JWT generated successfully expires_in=%s", int(expires_in_f))
    return _cached_access_token


async def get_access_token(*, force_refresh: bool = False) -> str:
    """Return a cached JWT, refreshing when missing/near-expiry or forced."""
    global _cached_access_token, _token_expires_at

    if not force_refresh and _jwt_is_fresh():
        assert _cached_access_token is not None
        return _cached_access_token

    async with _token_lock:
        if not force_refresh and _jwt_is_fresh():
            assert _cached_access_token is not None
            return _cached_access_token
        if force_refresh:
            logger.info("[IMD] JWT expired; refreshing token")
            clear_cached_jwt()
        return await _fetch_jwt()


async def _auth_headers(*, force_refresh: bool = False) -> dict[str, str]:
    token = await get_access_token(force_refresh=force_refresh)
    return {
        "X-API-KEY": settings.imd_api_key.strip(),
        "Authorization": f"Bearer {token}",
    }


def _as_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("data", "Data", "result", "results", "stations", "Records"):
            inner = payload.get(key)
            if isinstance(inner, list):
                return [row for row in inner if isinstance(row, dict)]
        return [payload]
    return []


def _pick(row: dict[str, Any], *keys: str) -> Any:
    lower_map = {str(k).lower().strip(): v for k, v in row.items()}
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
        alt = lower_map.get(key.lower())
        if alt not in (None, ""):
            return alt
    return None


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def _as_int(value: Any) -> int | None:
    num = _as_float(value)
    if num is None:
        return None
    return int(num)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _imd_condition(code: int | None) -> tuple[str, str]:
    """Map IMD present-weather codes (01-99) to (label, condition_group)."""
    if code is None:
        return ("Unknown", "cloudy")
    table: dict[int, tuple[str, str]] = {
        1: ("Clouds dissolving", "cloudy"),
        2: ("Sky unchanged", "cloudy"),
        3: ("Clouds developing", "cloudy"),
        4: ("Smoke reducing visibility", "fog"),
        5: ("Haze", "fog"),
        6: ("Widespread dust", "fog"),
        7: ("Dust or sand raised by wind", "fog"),
        8: ("Dust/sand whirls", "fog"),
        9: ("Duststorm or sandstorm in sight", "storm"),
        10: ("Mist", "fog"),
        11: ("Shallow fog patches", "fog"),
        12: ("Continuous shallow fog", "fog"),
        13: ("Lightning, no thunder", "storm"),
        17: ("Thunderstorm, no precipitation", "storm"),
        18: ("Squalls", "storm"),
        19: ("Funnel cloud", "storm"),
        20: ("Drizzle", "drizzle"),
        21: ("Rain", "rain"),
        22: ("Snow", "snow"),
        23: ("Rain and snow", "snow"),
        24: ("Freezing rain/drizzle", "rain"),
        25: ("Rain showers", "rain"),
        26: ("Snow showers", "snow"),
        27: ("Hail showers", "storm"),
        28: ("Fog", "fog"),
        29: ("Thunderstorm", "storm"),
        45: ("Fog", "fog"),
        50: ("Slight drizzle", "drizzle"),
        51: ("Slight drizzle", "drizzle"),
        53: ("Moderate drizzle", "drizzle"),
        55: ("Dense drizzle", "drizzle"),
        60: ("Slight rain", "rain"),
        61: ("Slight rain", "rain"),
        63: ("Moderate rain", "rain"),
        65: ("Heavy rain", "rain"),
        70: ("Slight snow", "snow"),
        71: ("Slight snow", "snow"),
        73: ("Moderate snow", "snow"),
        75: ("Heavy snow", "snow"),
        80: ("Slight rain showers", "rain"),
        81: ("Moderate rain showers", "rain"),
        82: ("Violent rain showers", "rain"),
        95: ("Thunderstorm", "storm"),
        96: ("Thunderstorm with hail", "storm"),
        97: ("Heavy thunderstorm", "storm"),
        99: ("Thunderstorm with heavy hail", "storm"),
    }
    if code in table:
        return table[code]
    if 4 <= code <= 12:
        return ("Reduced visibility", "fog")
    if 20 <= code <= 27:
        return ("Precipitation", "rain")
    if 50 <= code <= 59:
        return ("Drizzle", "drizzle")
    if 60 <= code <= 69:
        return ("Rain", "rain")
    if 70 <= code <= 79:
        return ("Snow", "snow")
    if 80 <= code <= 90:
        return ("Showers", "rain")
    if code >= 91:
        return ("Thunderstorm", "storm")
    if code <= 3:
        return ("Cloudy", "cloudy")
    return ("Unknown", "cloudy")


def _wind_direction_degrees(code: Any) -> float | None:
    """Return degrees, or None when the observation does not include a direction."""
    value = _as_float(code)
    if value is None:
        return None
    # Explicit 0 can mean calm/variable depending on station; keep it when reported.
    return float(value)


async def _imd_get(path: str, params: dict[str, Any] | None = None) -> Any:
    """Authenticated GET against IMD_BASE_URL. On 401: refresh JWT once and retry once."""
    url = f"{_base_url()}/{path.lstrip('/')}"
    client = get_http_client()

    async def _once(*, force_refresh: bool) -> httpx.Response:
        headers = await _auth_headers(force_refresh=force_refresh)
        logger.info("[IMD] Authenticated IMD request path=%s", path)
        return await client.get(url, params=params or {}, headers=headers)

    try:
        resp = await _once(force_refresh=False)
    except UpstreamAPIError:
        raise
    except httpx.TimeoutException as exc:
        logger.warning("[IMD] timeout path=%s error=%s", path, type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD request timed out") from exc
    except httpx.HTTPError as exc:
        logger.warning("[IMD] transport error path=%s error=%s", path, type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD request failed") from exc

    if resp.status_code == 401:
        logger.info("[IMD] JWT expired; refreshing token")
        try:
            resp = await _once(force_refresh=True)
        except UpstreamAPIError:
            raise
        except httpx.HTTPError as exc:
            logger.warning("[IMD] retry transport error path=%s error=%s", path, type(exc).__name__)
            raise UpstreamAPIError("imd", "IMD request failed after JWT refresh") from exc

    if resp.status_code >= 400:
        logger.warning("[IMD] HTTP %s path=%s body=%s", resp.status_code, path, _redact(resp.text))
        raise UpstreamAPIError("imd", f"IMD HTTP {resp.status_code}")

    try:
        return resp.json()
    except ValueError as exc:
        logger.warning("[IMD] invalid JSON path=%s body=%s", path, _redact(resp.text))
        raise UpstreamAPIError("imd", "IMD returned invalid JSON") from exc


def _normalize_station_name(name: str) -> str:
    """Exact-match key: uppercase, trim, collapse whitespace. No fuzzy aliases."""
    return re.sub(r"\s+", " ", (name or "").upper().strip())


def _forecast_station_code(row: dict[str, Any]) -> str | None:
    value = _pick(row, "Station_Code", "Station_Code ", "station_code")
    if value is None:
        return None
    return str(value).strip() or None


def _current_station_id(row: dict[str, Any]) -> str | None:
    value = _pick(row, "Station Id", "Station_Id", "StationId")
    if value is None:
        return None
    return str(value).strip() or None


def _station_id(row: dict[str, Any]) -> str | None:
    """Best-effort id from either catalogue (tests / response matching)."""
    found = _current_station_id(row) or _forecast_station_code(row)
    if found:
        return found
    value = _pick(row, "id", "Id", "ID")
    if value is None or value == "":
        return None
    return str(value).strip()


def _station_coords(row: dict[str, Any]) -> tuple[float, float] | None:
    lat = _as_float(_pick(row, "Latitude", "latitude", "lat", "Lat"))
    lon = _as_float(_pick(row, "Longitude", "longitude", "lon", "Lon", "lng"))
    if lat is None or lon is None:
        return None
    return lat, lon


def _unique_name_index(
    rows: list[dict[str, Any]],
    *,
    id_fn,
    name_keys: tuple[str, ...],
) -> dict[str, dict[str, Any]]:
    """Map normalized name -> unique row. Ambiguous names are omitted (never guess)."""
    by_name: dict[str, dict[str, Any]] = {}
    ambiguous: set[str] = set()
    for row in rows:
        sid = id_fn(row)
        name_raw = _pick(row, *name_keys)
        if sid is None or name_raw in (None, ""):
            continue
        key = _normalize_station_name(str(name_raw))
        if not key:
            continue
        entry = {"id": sid, "name": str(name_raw).strip(), "row": row}
        if key in by_name and by_name[key]["id"] != sid:
            ambiguous.add(key)
            continue
        by_name[key] = entry
    for key in ambiguous:
        by_name.pop(key, None)
    return by_name


def build_verified_observation_stations(
    forecast_rows: list[dict[str, Any]],
    current_wx_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Join cityforecastloc coords to current_wx Station Ids via exact normalized names."""
    wx_by_name = _unique_name_index(
        current_wx_rows,
        id_fn=_current_station_id,
        name_keys=("Station", "Station_Name", "name"),
    )
    verified: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for row in forecast_rows:
        coords = _station_coords(row)
        name_raw = _pick(row, "Station_Name", "Station", "name", "City")
        if not coords or name_raw in (None, ""):
            continue
        key = _normalize_station_name(str(name_raw))
        wx = wx_by_name.get(key)
        if not wx:
            continue
        obs_id = wx["id"]
        if obs_id in seen_ids:
            continue
        seen_ids.add(obs_id)
        verified.append(
            {
                "id": obs_id,
                "forecast_code": _forecast_station_code(row) or "",
                "name": wx["name"],
                "forecast_name": str(name_raw).strip(),
                "lat": coords[0],
                "lon": coords[1],
            }
        )
    return verified


async def _load_verified_observation_stations() -> list[dict[str, Any]]:
    """Cached join of cityforecastloc (coords) ∩ current_wx (valid observation ids)."""

    async def _fetch() -> list[dict[str, Any]]:
        forecast_rows: list[dict[str, Any]] = []
        for path in ("cityforecastloc", "cityforecast_mapping"):
            try:
                payload = await _imd_get(path)
            except UpstreamAPIError:
                logger.warning("[IMD] mapping endpoint unavailable path=%s", path)
                continue
            forecast_rows = _as_list(payload)
            if forecast_rows:
                logger.info("[IMD] loaded %d forecast-location rows from %s", len(forecast_rows), path)
                break
        if not forecast_rows:
            raise UpstreamAPIError("imd", "IMD station mapping unavailable")

        try:
            wx_payload = await _imd_get("current_wx")
        except UpstreamAPIError as exc:
            logger.warning("[IMD] bulk current_wx catalogue unavailable")
            raise UpstreamAPIError("imd", "IMD current observation catalogue unavailable") from exc
        wx_rows = _as_list(wx_payload)
        if not wx_rows:
            raise UpstreamAPIError("imd", "IMD current observation catalogue empty")

        verified = build_verified_observation_stations(forecast_rows, wx_rows)
        if not verified:
            raise UpstreamAPIError("imd", "No verified IMD observation stations after name join")
        logger.info(
            "[IMD] verified observation stations=%d (forecast=%d current_wx=%d)",
            len(verified),
            len(forecast_rows),
            len(wx_rows),
        )
        return verified

    return await _mapping_cache.get_or_set("imd:verified-obs-stations", _fetch)


async def _nearest_verified_station(lat: float, lon: float) -> dict[str, Any]:
    stations = await _load_verified_observation_stations()
    best: dict[str, Any] | None = None
    best_km = float("inf")
    for station in stations:
        dist = _haversine_km(lat, lon, station["lat"], station["lon"])
        if dist < best_km:
            best_km = dist
            best = {**station, "distance_km": dist}
    if best is None or best_km > _MAX_STATION_DISTANCE_KM:
        logger.warning(
            "[IMD] no verified observation station within %.0fkm of lat=%.4f lon=%.4f (nearest=%.1fkm)",
            _MAX_STATION_DISTANCE_KM,
            lat,
            lon,
            best_km if best else -1,
        )
        raise UpstreamAPIError("imd", "No nearby IMD observation station for requested coordinates")
    logger.info(
        "[IMD] nearest verified station id=%s name=%s distance_km=%.1f forecast_code=%s",
        best["id"],
        best["name"],
        best_km,
        best.get("forecast_code") or "",
    )
    return best


# Back-compat alias used by older tests / call sites.
async def _nearest_station(lat: float, lon: float) -> dict[str, Any]:
    return await _nearest_verified_station(lat, lon)


def _observed_at(row: dict[str, Any]) -> str:
    date_part = _pick(row, "Date of Observation", "Date", "date")
    time_part = _pick(row, "Time of Observation", "Time", "time", "UTC")
    if date_part and time_part:
        raw = f"{date_part}T{time_part}"
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%dT%H%M", "%Y-%m-%dT%H"):
            try:
                dt = datetime.strptime(str(raw).replace(" ", ""), fmt).replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
        return f"{date_part}T{time_part}Z"
    if date_part:
        return f"{date_part}T00:00:00Z"
    return datetime.now(timezone.utc).isoformat()


def _normalize_current(
    row: dict[str, Any],
    lat: float,
    lon: float,
    name: str | None,
    station_name: str,
    *,
    station_id: str | None = None,
    station_distance_km: float | None = None,
) -> WeatherResponse:
    temp = _as_float(_pick(row, "Temperature", "temperature", "Temp", "CURR_TEMP"))
    if temp is None:
        raise UpstreamAPIError("imd", "IMD observation missing temperature")

    # Do NOT coerce missing numerics to 0 — pressure 0 hPa is misleading; field-level
    # fallback in weather_provider fills gaps from Open-Meteo / Weatherstack.
    humidity = _as_float(_pick(row, "Humidity", "humidity", "RH"))
    wind_speed = _as_float(_pick(row, "Wind Speed", "Wind_Speed", "wind_speed", "WIND_SPEED"))
    pressure = _as_float(_pick(row, "M.S.L.P", "MSLP", "Pressure", "pressure"))
    precip = _as_float(_pick(row, "Last 24 hrs Rainfall", "Rainfall", "rainfall"))
    wx_code = _as_int(_pick(row, "Weather Code", "Weather_Code", "weather_code", "WeatherCode", "WEATHER_CODE"))
    condition, group = _imd_condition(wx_code)
    feels_raw = _as_float(_pick(row, "Feel Like", "feels_like", "Feels_Like"))
    feels = feels_raw if feels_raw is not None else temp
    obs_name = str(_pick(row, "Station", "Station_Name") or station_name or "").strip() or station_name
    obs_id = _current_station_id(row) or station_id

    current = CurrentWeather(
        temperature=temp,
        feels_like=feels,
        condition=condition,
        condition_code=wx_code if wx_code is not None else 0,
        condition_group=group,
        is_day=True,
        humidity=humidity,
        wind_speed=wind_speed,
        wind_direction=_wind_direction_degrees(
            _pick(row, "Wind Direction", "Wind_Direction", "wind_direction", "WIND_DIRECTION")
        ),
        pressure=pressure,
        precipitation=precip,
        uv_index=None,
        visibility=None,
        observed_at=_observed_at(row),
    )

    return WeatherResponse(
        location=LocationInfo(
            # Keep the user's requested place name; observation station is separate metadata.
            name=name or "Selected location",
            lat=lat,
            lon=lon,
            timezone="Asia/Kolkata",
        ),
        current=current,
        source="imd",
        is_demo=False,
        provider_label="IMD – Official Current Weather",
        observation_station=obs_name or None,
        observation_station_id=obs_id,
        station_distance_km=round(station_distance_km, 3) if station_distance_km is not None else None,
    )


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    if not is_configured():
        raise UpstreamAPIError("imd", "IMD credentials not configured")

    cache_key = f"imd:current:{location_key(lat, lon)}"

    async def _fetch() -> WeatherResponse:
        station = await _nearest_verified_station(lat, lon)
        payload = await _imd_get("current_wx", params={"id": station["id"]})
        rows = _as_list(payload)
        if not rows:
            logger.warning("[IMD] empty current_wx for station id=%s", station["id"])
            raise UpstreamAPIError("imd", "IMD current weather empty")

        chosen = rows[0]
        for row in rows:
            sid = _current_station_id(row) or _station_id(row)
            if sid and sid == str(station["id"]):
                chosen = row
                break

        return _normalize_current(
            chosen,
            lat,
            lon,
            name,
            station["name"],
            station_id=str(station["id"]),
            station_distance_km=float(station.get("distance_km") or 0.0),
        )

    try:
        return await _obs_cache.get_or_set(cache_key, _fetch)
    except UpstreamAPIError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("[IMD] unexpected error type=%s detail=%s", type(exc).__name__, _safe_exc_message(exc))
        raise UpstreamAPIError("imd", "IMD weather unavailable") from exc


async def get_district_warnings(lat: float, lon: float) -> list[WeatherAlert]:
    """Official IMD district warnings + nowcast via catalog-matched Obj_id (never invented)."""
    from .imd_districts import fetch_district_alerts

    result = await fetch_district_alerts(lat, lon)
    return result.alerts
