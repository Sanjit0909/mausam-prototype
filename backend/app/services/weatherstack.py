"""Third weather fallback rung using Weatherstack (key-based, current weather only).

Weatherstack's free plan covers real-time/current weather only (forecast/historical need a
paid plan) and free-tier requests must use plain HTTP, not HTTPS - both are accounted for
below. Used by weather_provider.py only when both Open-Meteo and OpenWeatherMap have failed.
"""
from datetime import datetime, timezone

from ..config import settings
from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_with_backoff
from ..models.common import LocationInfo
from ..models.weather import CurrentWeather, WeatherResponse

# Free-tier Weatherstack requires plain HTTP - HTTPS needs a paid plan.
CURRENT_URL = "http://api.weatherstack.com/current"

_cache = TTLCache(ttl_seconds=600)

_RAIN_KEYWORDS = ("rain", "drizzle", "shower")
_SNOW_KEYWORDS = ("snow", "sleet", "ice pellet", "blizzard")
_STORM_KEYWORDS = ("thunder",)
_FOG_KEYWORDS = ("fog", "mist", "haze")
_CLEAR_KEYWORDS = ("sunny", "clear")


def _condition_group(description: str) -> str:
    desc = description.lower()
    if any(k in desc for k in _STORM_KEYWORDS):
        return "storm"
    if any(k in desc for k in _SNOW_KEYWORDS):
        return "snow"
    if any(k in desc for k in _RAIN_KEYWORDS):
        return "drizzle" if "patchy" in desc or "light" in desc else "rain"
    if any(k in desc for k in _FOG_KEYWORDS):
        return "fog"
    if any(k in desc for k in _CLEAR_KEYWORDS):
        return "clear"
    if "cloud" in desc or "overcast" in desc:
        return "cloudy"
    return "cloudy"


def _location_info(name: str | None, lat: float, lon: float) -> LocationInfo:
    return LocationInfo(name=name or "Selected location", lat=lat, lon=lon)


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    key = f"weatherstack-current:{location_key(lat, lon)}"

    async def _fetch() -> dict:
        try:
            resp = await get_with_backoff(
                CURRENT_URL,
                params={"access_key": settings.weatherstack_api_key, "query": f"{lat},{lon}", "units": "m"},
                max_retries=1,
            )
            data = resp.json()
            if "error" in data:
                raise UpstreamAPIError("weatherstack", data["error"].get("info", "Weatherstack request failed"))
            return data
        except UpstreamAPIError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise UpstreamAPIError("weatherstack", "Weather data is temporarily unavailable") from exc

    raw = await _cache.get_or_set(key, _fetch)
    current = raw["current"]
    description = (current.get("weather_descriptions") or ["Unknown"])[0]
    group = _condition_group(description)

    def _num(key: str):
        if key not in current or current[key] is None or current[key] == "":
            return None
        try:
            return float(current[key])
        except (TypeError, ValueError):
            return None

    weather = CurrentWeather(
        temperature=float(current["temperature"]),
        feels_like=float(current["feelslike"]) if current.get("feelslike") is not None else float(current["temperature"]),
        condition=description,
        condition_code=current.get("weather_code", 0),
        condition_group=group,
        is_day=(current.get("is_day", "yes") == "yes"),
        # Missing keys stay None so field-merge can skip invalid Weatherstack gaps.
        humidity=_num("humidity"),
        wind_speed=_num("wind_speed"),
        wind_direction=_num("wind_degree"),
        pressure=_num("pressure"),
        precipitation=_num("precip"),
        uv_index=_num("uv_index"),
        visibility=_num("visibility"),
        observed_at=datetime.now(timezone.utc).isoformat(),
    )

    return WeatherResponse(location=_location_info(name, lat, lon), current=weather, source="weatherstack")
