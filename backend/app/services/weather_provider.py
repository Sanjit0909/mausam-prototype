"""Unified weather/forecast interface with automatic provider fallback.

Tries Open-Meteo first (richer data, no key needed - the right default for local dev and
most hosting) and transparently falls back to OpenWeatherMap (key-based, immune to shared-IP
rate limiting) only if Open-Meteo fails. This mirrors the same fallback philosophy already
used for the AI assistant (Gemini -> rule-based): the feature always works, and automatically
uses the best available source without any caller needing to know which one responded.
"""
import logging

from ..config import settings
from ..models.weather import ForecastResponse, WeatherResponse
from . import open_meteo, openweathermap

logger = logging.getLogger(__name__)


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    try:
        return await open_meteo.get_current_weather(lat, lon, name)
    except Exception:  # noqa: BLE001 - fall back only if a real fallback is configured
        if not settings.has_owm_key:
            raise
        logger.warning("Open-Meteo current weather failed; falling back to OpenWeatherMap")
        return await openweathermap.get_current_weather(lat, lon, name)


async def get_forecast(lat: float, lon: float, days: int = 7, name: str | None = None) -> ForecastResponse:
    try:
        return await open_meteo.get_forecast(lat, lon, days, name)
    except Exception:  # noqa: BLE001
        if not settings.has_owm_key:
            raise
        logger.warning("Open-Meteo forecast failed; falling back to OpenWeatherMap")
        return await openweathermap.get_forecast(lat, lon, days, name)


async def get_sun_times(lat: float, lon: float) -> tuple[str | None, str | None]:
    """Returns (sunrise_iso, sunset_iso), preferring Open-Meteo's daily block."""
    try:
        raw = await open_meteo.fetch_raw(lat, lon)
        daily = raw.get("daily", {})
        sunrise = daily.get("sunrise", [None])[0]
        sunset = daily.get("sunset", [None])[0]
        if sunrise or sunset:
            return sunrise, sunset
        raise ValueError("No sunrise/sunset in Open-Meteo response")
    except Exception:  # noqa: BLE001
        if not settings.has_owm_key:
            return None, None
        try:
            return await openweathermap.get_sun_times(lat, lon)
        except Exception:  # noqa: BLE001
            return None, None
