"""Current weather + forecast adapter backed by Open-Meteo (free, no API key)."""
from datetime import datetime, timezone

from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_http_client
from ..models.common import LocationInfo
from ..models.weather import CurrentWeather, DailyPoint, ForecastResponse, HourlyPoint, WeatherResponse
from .weather_codes import describe_weather_code

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

CURRENT_VARS = (
    "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,"
    "precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index"
)
HOURLY_VARS = "temperature_2m,precipitation_probability,weather_code,wind_speed_10m,uv_index,visibility"
DAILY_VARS = (
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,"
    "sunrise,sunset,uv_index_max"
)

_cache = TTLCache(ttl_seconds=300)


async def fetch_raw(lat: float, lon: float, days: int) -> dict:
    key = f"raw:{location_key(lat, lon)}:{days}"

    async def _fetch() -> dict:
        client = get_http_client()
        try:
            resp = await client.get(
                FORECAST_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": CURRENT_VARS,
                    "hourly": HOURLY_VARS,
                    "daily": DAILY_VARS,
                    "timezone": "auto",
                    "forecast_days": days,
                },
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001 - normalize all upstream failures
            stale = _cache.get_stale(key)
            if stale is not None:
                return stale
            raise UpstreamAPIError("open-meteo", "Weather data is temporarily unavailable") from exc

    return await _cache.get_or_set(key, _fetch)


def _location_info(raw: dict, lat: float, lon: float, name: str | None) -> LocationInfo:
    return LocationInfo(
        name=name or "Selected location",
        lat=raw.get("latitude", lat),
        lon=raw.get("longitude", lon),
        timezone=raw.get("timezone"),
    )


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    raw = await fetch_raw(lat, lon, days=1)
    current = raw["current"]
    condition, group = describe_weather_code(current.get("weather_code", 0))

    hourly_visibility = None
    hourly = raw.get("hourly", {})
    if hourly.get("time") and hourly.get("visibility"):
        now_iso = current.get("time")
        try:
            idx = hourly["time"].index(now_iso)
            hourly_visibility = hourly["visibility"][idx]
        except ValueError:
            hourly_visibility = hourly["visibility"][0] if hourly["visibility"] else None

    weather = CurrentWeather(
        temperature=current["temperature_2m"],
        feels_like=current["apparent_temperature"],
        condition=condition,
        condition_code=current.get("weather_code", 0),
        condition_group=group,
        is_day=bool(current.get("is_day", 1)),
        humidity=current["relative_humidity_2m"],
        wind_speed=current["wind_speed_10m"],
        wind_direction=current["wind_direction_10m"],
        pressure=current["pressure_msl"],
        precipitation=current.get("precipitation", 0),
        uv_index=current.get("uv_index"),
        visibility=(hourly_visibility / 1000) if hourly_visibility else None,
        observed_at=current.get("time", datetime.now(timezone.utc).isoformat()),
    )

    return WeatherResponse(location=_location_info(raw, lat, lon, name), current=weather)


async def get_forecast(lat: float, lon: float, days: int = 7, name: str | None = None) -> ForecastResponse:
    raw = await fetch_raw(lat, lon, days=days)

    hourly_raw = raw.get("hourly", {})
    hourly_points: list[HourlyPoint] = []
    times = hourly_raw.get("time", [])
    for i, t in enumerate(times):
        code = hourly_raw.get("weather_code", [0] * len(times))[i]
        condition, group = describe_weather_code(code)
        vis = hourly_raw.get("visibility", [None] * len(times))[i]
        hourly_points.append(
            HourlyPoint(
                time=t,
                temperature=hourly_raw["temperature_2m"][i],
                precipitation_probability=hourly_raw.get("precipitation_probability", [None] * len(times))[i],
                condition_code=code,
                condition_group=group,
                wind_speed=hourly_raw.get("wind_speed_10m", [None] * len(times))[i],
                uv_index=hourly_raw.get("uv_index", [None] * len(times))[i],
                visibility=(vis / 1000) if vis is not None else None,
            )
        )

    daily_raw = raw.get("daily", {})
    daily_points: list[DailyPoint] = []
    dates = daily_raw.get("time", [])
    for i, d in enumerate(dates):
        code = daily_raw.get("weather_code", [0] * len(dates))[i]
        condition, group = describe_weather_code(code)
        daily_points.append(
            DailyPoint(
                date=d,
                temp_max=daily_raw["temperature_2m_max"][i],
                temp_min=daily_raw["temperature_2m_min"][i],
                precipitation_probability_max=daily_raw.get("precipitation_probability_max", [None] * len(dates))[i],
                condition_code=code,
                condition_group=group,
                sunrise=daily_raw.get("sunrise", [None] * len(dates))[i],
                sunset=daily_raw.get("sunset", [None] * len(dates))[i],
                uv_index_max=daily_raw.get("uv_index_max", [None] * len(dates))[i],
            )
        )

    return ForecastResponse(
        location=_location_info(raw, lat, lon, name),
        hourly=hourly_points,
        daily=daily_points,
    )
