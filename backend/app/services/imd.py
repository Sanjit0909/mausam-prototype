"""IMD (India Meteorological Department) provider - authoritative Indian weather source.

Official reference: https://api.imd.gov.in/public/api_reference.html

Current-weather flow for /api/weather (lat, lon, name):
1. Load city/station list from official `cityforecastloc` (includes Latitude/Longitude).
2. Pick the nearest station to the requested coordinates (no invented station IDs).
3. Fetch live observation from official `current_wx?id=<StationId>`.

Auth: API key from IMD_API_KEY, sent as header (default `X-API-KEY`).
Never logs the key, Authorization headers, or .env contents.
"""
from __future__ import annotations

import logging
import math
import re
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

# Reject nearest-station matches farther than this (degrees ~km via haversine).
_MAX_STATION_DISTANCE_KM = 150.0

_SECRET_RE = re.compile(r"(?i)(api[_-]?key|authorization|bearer|token)\s*[:=]\s*\S+")


def is_configured() -> bool:
    return settings.has_imd_key


def _auth_headers() -> dict[str, str]:
    """Build IMD auth headers without exposing the key to logs."""
    header_name = (settings.imd_auth_header or "X-API-KEY").strip() or "X-API-KEY"
    return {header_name: settings.imd_api_key.strip()}


def _base_url() -> str:
    return settings.imd_base_url.rstrip("/")


def _redact(text: str, limit: int = 300) -> str:
    cleaned = _SECRET_RE.sub(r"\1=[REDACTED]", text or "")
    return cleaned[:limit]


def _as_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]
    if isinstance(payload, dict):
        for key in ("data", "Data", "result", "results", "stations", "Records"):
            inner = payload.get(key)
            if isinstance(inner, list):
                return [row for row in inner if isinstance(row, dict)]
        # Single-object response
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
    # Descriptions condensed from official current_wx weather-code table.
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


def _wind_direction_degrees(code: Any) -> float:
    """IMD wind-direction codes are already roughly degrees (0=calm, 90=E, 180=S, ...)."""
    value = _as_float(code)
    if value is None:
        return 0.0
    return 0.0 if value == 0 else float(value)


async def _imd_get(path: str, params: dict[str, Any] | None = None) -> Any:
    url = f"{_base_url()}/{path.lstrip('/')}"
    client = get_http_client()
    try:
        resp = await client.get(url, params=params or {}, headers=_auth_headers())
    except httpx.TimeoutException as exc:
        logger.warning("[IMD] timeout path=%s error=%s", path, type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD request timed out") from exc
    except httpx.HTTPError as exc:
        logger.warning("[IMD] transport error path=%s error=%s", path, type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD request failed") from exc

    if resp.status_code >= 400:
        body = _redact(resp.text)
        logger.warning(
            "[IMD] HTTP %s path=%s body=%s",
            resp.status_code,
            path,
            body,
        )
        raise UpstreamAPIError("imd", f"IMD HTTP {resp.status_code}")

    try:
        return resp.json()
    except ValueError as exc:
        logger.warning("[IMD] invalid JSON path=%s body=%s", path, _redact(resp.text))
        raise UpstreamAPIError("imd", "IMD returned invalid JSON") from exc


def _station_id(row: dict[str, Any]) -> str | None:
    value = _pick(row, "Station_Code", "Station Id", "Station_Id", "StationId", "id", "Id", "ID")
    if value is None:
        return None
    return str(value).strip()


def _station_coords(row: dict[str, Any]) -> tuple[float, float] | None:
    lat = _as_float(_pick(row, "Latitude", "latitude", "lat", "Lat"))
    lon = _as_float(_pick(row, "Longitude", "longitude", "lon", "Lon", "lng"))
    if lat is None or lon is None:
        return None
    return lat, lon


async def _load_station_mapping() -> list[dict[str, Any]]:
    """Official city/station list with coordinates from cityforecastloc."""

    async def _fetch() -> list[dict[str, Any]]:
        # Prefer cityforecastloc (docs: includes Latitude/Longitude). Fall back to mapping.
        for path in ("cityforecastloc", "cityforecast_mapping"):
            try:
                payload = await _imd_get(path)
            except UpstreamAPIError:
                logger.warning("[IMD] mapping endpoint unavailable path=%s", path)
                continue
            rows = _as_list(payload)
            usable = []
            for row in rows:
                sid = _station_id(row)
                coords = _station_coords(row)
                if not sid or not coords:
                    continue
                usable.append(
                    {
                        "id": sid,
                        "name": str(_pick(row, "Station_Name", "Station", "name", "City") or sid),
                        "lat": coords[0],
                        "lon": coords[1],
                    }
                )
            if usable:
                logger.info("[IMD] loaded %d stations from %s", len(usable), path)
                return usable
        raise UpstreamAPIError("imd", "IMD station mapping unavailable")

    return await _mapping_cache.get_or_set("imd:station-mapping", _fetch)


async def _nearest_station(lat: float, lon: float) -> dict[str, Any]:
    stations = await _load_station_mapping()
    best: dict[str, Any] | None = None
    best_km = float("inf")
    for station in stations:
        dist = _haversine_km(lat, lon, station["lat"], station["lon"])
        if dist < best_km:
            best_km = dist
            best = station
    if best is None or best_km > _MAX_STATION_DISTANCE_KM:
        logger.warning(
            "[IMD] no station within %.0fkm of lat=%.4f lon=%.4f (nearest=%.1fkm)",
            _MAX_STATION_DISTANCE_KM,
            lat,
            lon,
            best_km if best else -1,
        )
        raise UpstreamAPIError("imd", "No nearby IMD station for requested coordinates")
    logger.info(
        "[IMD] nearest station id=%s name=%s distance_km=%.1f",
        best["id"],
        best["name"],
        best_km,
    )
    return best


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


def _normalize_current(row: dict[str, Any], lat: float, lon: float, name: str | None, station_name: str) -> WeatherResponse:
    temp = _as_float(_pick(row, "Temperature", "temperature", "Temp"))
    if temp is None:
        raise UpstreamAPIError("imd", "IMD observation missing temperature")

    humidity = _as_float(_pick(row, "Humidity", "humidity")) or 0.0
    wind_speed = _as_float(_pick(row, "Wind Speed", "Wind_Speed", "wind_speed")) or 0.0
    pressure = _as_float(_pick(row, "M.S.L.P", "MSLP", "Pressure", "pressure")) or 0.0
    precip = _as_float(_pick(row, "Last 24 hrs Rainfall", "Rainfall", "rainfall")) or 0.0
    wx_code = _as_int(_pick(row, "Weather Code", "Weather_Code", "weather_code", "WeatherCode"))
    condition, group = _imd_condition(wx_code)

    current = CurrentWeather(
        temperature=temp,
        feels_like=temp,
        condition=condition,
        condition_code=wx_code if wx_code is not None else 0,
        condition_group=group,
        is_day=True,
        humidity=humidity,
        wind_speed=wind_speed,
        wind_direction=_wind_direction_degrees(_pick(row, "Wind Direction", "Wind_Direction", "wind_direction")),
        pressure=pressure,
        precipitation=precip,
        uv_index=None,
        visibility=None,
        observed_at=_observed_at(row),
    )

    return WeatherResponse(
        location=LocationInfo(
            name=name or station_name or "Selected location",
            lat=lat,
            lon=lon,
            timezone="Asia/Kolkata",
        ),
        current=current,
        source="imd",
        is_demo=False,
    )


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    if not is_configured():
        raise UpstreamAPIError("imd", "IMD API key not yet configured")

    cache_key = f"imd:current:{location_key(lat, lon)}"

    async def _fetch() -> WeatherResponse:
        station = await _nearest_station(lat, lon)
        payload = await _imd_get("current_wx", params={"id": station["id"]})
        rows = _as_list(payload)
        if not rows:
            logger.warning("[IMD] empty current_wx for station id=%s", station["id"])
            raise UpstreamAPIError("imd", "IMD current weather empty")

        # Prefer the row matching the requested station id when a list is returned.
        chosen = rows[0]
        for row in rows:
            sid = _station_id(row)
            if sid and sid == str(station["id"]):
                chosen = row
                break

        return _normalize_current(chosen, lat, lon, name, station["name"])

    try:
        return await _obs_cache.get_or_set(cache_key, _fetch)
    except UpstreamAPIError:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.warning("[IMD] unexpected error type=%s", type(exc).__name__)
        raise UpstreamAPIError("imd", "IMD weather unavailable") from exc


async def get_district_warnings(lat: float, lon: float) -> list[WeatherAlert]:
    """District warnings require district Obj_id mapping; not invented here.

    Returns [] so alerts_provider continues to NWS/derived tiers without fabricating data.
    """
    if not is_configured():
        logger.info("[Alerts] IMD unavailable (no key configured)")
        return []
    # Keep weather fix scoped: district Obj_id lookup is a separate mapping problem.
    logger.info(
        "[Alerts] IMD districtwarning not mapped for lat=%.4f lon=%.4f; skipping official IMD alerts",
        lat,
        lon,
    )
    return []
