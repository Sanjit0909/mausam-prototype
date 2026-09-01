"""Fallback weather/forecast adapter using OpenWeatherMap (free, key-based).

Used automatically by weather_provider.py only when Open-Meteo's shared/keyless endpoint is
unavailable (e.g. rate-limited on a shared hosting IP where unrelated apps share the same
egress address) - never the primary source when Open-Meteo is working fine (e.g. local dev).
OpenWeatherMap's free tier limit is tied to this app's own API key, not the host's IP, so it
is immune to the "noisy neighbor" problem that affects keyless, IP-limited free APIs.
"""
from collections import defaultdict
from datetime import datetime, timezone

from ..config import settings
from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_with_backoff
from ..models.common import LocationInfo
from ..models.weather import CurrentWeather, DailyPoint, ForecastResponse, HourlyPoint, WeatherResponse

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

_cache = TTLCache(ttl_seconds=600)

_CONDITION_GROUP_MAP = {
    "Clear": "clear",
    "Clouds": "cloudy",
    "Rain": "rain",
    "Drizzle": "drizzle",
    "Thunderstorm": "storm",
    "Snow": "snow",
    "Mist": "fog",
    "Fog": "fog",
    "Haze": "fog",
    "Smoke": "fog",
    "Dust": "fog",
    "Sand": "fog",
    "Ash": "fog",
    "Squall": "storm",
    "Tornado": "storm",
}


def _condition_group(main: str) -> str:
    return _CONDITION_GROUP_MAP.get(main, "cloudy")


def _location_info(name: str | None, lat: float, lon: float) -> LocationInfo:
    return LocationInfo(name=name or "Selected location", lat=lat, lon=lon)


async def _fetch_current_raw(lat: float, lon: float) -> dict:
    key = f"owm-current:{location_key(lat, lon)}"

    async def _fetch() -> dict:
        try:
            resp = await get_with_backoff(
                CURRENT_URL,
                params={"lat": lat, "lon": lon, "appid": settings.openweathermap_api_key, "units": "metric"},
                max_retries=1,
            )
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamAPIError("openweathermap", "Weather data is temporarily unavailable") from exc

    return await _cache.get_or_set(key, _fetch)


async def _fetch_forecast_raw(lat: float, lon: float) -> dict:
    key = f"owm-forecast:{location_key(lat, lon)}"

    async def _fetch() -> dict:
        try:
            resp = await get_with_backoff(
                FORECAST_URL,
                params={"lat": lat, "lon": lon, "appid": settings.openweathermap_api_key, "units": "metric"},
                max_retries=1,
            )
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamAPIError("openweathermap", "Forecast data is temporarily unavailable") from exc

    return await _cache.get_or_set(key, _fetch)


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    raw = await _fetch_current_raw(lat, lon)
    main = raw["main"]
    weather0 = raw["weather"][0]
    group = _condition_group(weather0["main"])
    dt = raw.get("dt")
    observed_at = datetime.fromtimestamp(dt, tz=timezone.utc).isoformat() if dt else datetime.now(timezone.utc).isoformat()

    sys_block = raw.get("sys", {})
    is_day = True
    if dt is not None and sys_block.get("sunrise") and sys_block.get("sunset"):
        is_day = sys_block["sunrise"] <= dt <= sys_block["sunset"]

    current = CurrentWeather(
        temperature=main["temp"],
        feels_like=main["feels_like"],
        condition=weather0["description"].capitalize(),
        condition_code=weather0["id"],
        condition_group=group,
        is_day=is_day,
        humidity=main["humidity"],
        wind_speed=raw.get("wind", {}).get("speed", 0) * 3.6,  # m/s -> km/h
        wind_direction=raw.get("wind", {}).get("deg", 0),
        pressure=main["pressure"],
        precipitation=0,  # not reliably present on this endpoint
        uv_index=None,  # needs a separate OWM endpoint - omitted rather than guessed
        visibility=(raw["visibility"] / 1000) if raw.get("visibility") else None,
        observed_at=observed_at,
    )

    return WeatherResponse(location=_location_info(name, lat, lon), current=current, source="openweathermap")


async def get_forecast(lat: float, lon: float, days: int = 7, name: str | None = None) -> ForecastResponse:
    raw = await _fetch_forecast_raw(lat, lon)
    items = raw.get("list", [])

    hourly_points: list[HourlyPoint] = []
    daily_buckets: dict[str, list[dict]] = defaultdict(list)

    for item in items:
        weather0 = item["weather"][0]
        group = _condition_group(weather0["main"])
        date_str, time_str = item["dt_txt"].split(" ")
        iso_time = f"{date_str}T{time_str[:5]}"

        hourly_points.append(
            HourlyPoint(
                time=iso_time,
                temperature=item["main"]["temp"],
                precipitation_probability=(item.get("pop") or 0) * 100,
                condition_code=weather0["id"],
                condition_group=group,
                wind_speed=item.get("wind", {}).get("speed", 0) * 3.6,
                uv_index=None,
                visibility=(item["visibility"] / 1000) if item.get("visibility") else None,
            )
        )
        daily_buckets[date_str].append(item)

    daily_points: list[DailyPoint] = []
    for date_str, bucket in list(daily_buckets.items())[:days]:
        temps = [b["main"]["temp"] for b in bucket]
        pops = [(b.get("pop") or 0) * 100 for b in bucket]
        # Free tier has no true daily forecast - use the item nearest midday as representative
        # for the day's overall condition (icon/description), matching what a "daily" view expects.
        representative = min(bucket, key=lambda b: abs(int(b["dt_txt"][11:13]) - 13))
        weather0 = representative["weather"][0]

        daily_points.append(
            DailyPoint(
                date=date_str,
                temp_max=max(temps),
                temp_min=min(temps),
                precipitation_probability_max=max(pops) if pops else None,
                condition_code=weather0["id"],
                condition_group=_condition_group(weather0["main"]),
                sunrise=None,  # not on this endpoint - astronomy uses get_sun_times() instead
                sunset=None,
                uv_index_max=None,
            )
        )

    return ForecastResponse(
        location=_location_info(name, lat, lon),
        hourly=hourly_points,
        daily=daily_points,
        source="openweathermap",
    )


async def get_sun_times(lat: float, lon: float) -> tuple[str | None, str | None]:
    """Returns (sunrise_iso, sunset_iso) from the current-weather endpoint's `sys` block,
    converted to the location's local time using OWM's UTC offset (in seconds)."""
    raw = await _fetch_current_raw(lat, lon)
    sys_block = raw.get("sys", {})
    tz_offset = raw.get("timezone", 0)

    def _to_local_iso(unix_ts: int | None) -> str | None:
        if unix_ts is None:
            return None
        local_dt = datetime.fromtimestamp(unix_ts + tz_offset, tz=timezone.utc)
        return local_dt.strftime("%Y-%m-%dT%H:%M")

    return _to_local_iso(sys_block.get("sunrise")), _to_local_iso(sys_block.get("sunset"))
