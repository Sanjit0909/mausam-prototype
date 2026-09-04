"""Unified weather/forecast interface with automatic provider fallback.

Chain: IMD (authoritative Indian source, once a key exists) -> Open-Meteo (free, richest
data) -> OpenWeatherMap (key-based, immune to shared-IP rate limiting) -> Weatherstack (key-
based, current weather only). Each rung is tried only if the previous one fails, and the
frontend/caller never needs to know which one actually answered - it just reads `source`.
This mirrors the same fallback philosophy used for the AI assistant.
"""
import logging
import time

from ..config import settings
from ..models.weather import ForecastResponse, WeatherResponse
from . import imd, open_meteo, openweathermap, weatherstack

logger = logging.getLogger(__name__)


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    if settings.has_imd_key:
        started = time.monotonic()
        try:
            result = await imd.get_current_weather(lat, lon, name)
            logger.info("[Weather] IMD success (%.2fs)", time.monotonic() - started)
            return result
        except Exception:  # noqa: BLE001
            logger.info("[Weather] IMD unavailable; falling back to Open-Meteo")

    try:
        return await open_meteo.get_current_weather(lat, lon, name)
    except Exception:  # noqa: BLE001
        logger.warning("[Weather] Open-Meteo failed")

    if settings.has_owm_key:
        try:
            logger.info("[Weather] Falling back to OpenWeatherMap")
            return await openweathermap.get_current_weather(lat, lon, name)
        except Exception:  # noqa: BLE001
            logger.warning("[Weather] OpenWeatherMap failed")

    if settings.has_weatherstack_key:
        logger.info("[Weather] Falling back to Weatherstack")
        return await weatherstack.get_current_weather(lat, lon, name)

    # Nothing left to try - re-raise the original Open-Meteo failure.
    return await open_meteo.get_current_weather(lat, lon, name)


async def get_forecast(lat: float, lon: float, days: int = 7, name: str | None = None) -> ForecastResponse:
    # IMD/Weatherstack forecast integrations are not implemented (IMD pending station-ID
    # mapping; Weatherstack's free tier has no forecast endpoint) - forecast only uses the
    # two providers that actually support it.
    try:
        return await open_meteo.get_forecast(lat, lon, days, name)
    except Exception:  # noqa: BLE001
        if not settings.has_owm_key:
            raise
        logger.warning("[Forecast] Open-Meteo failed; falling back to OpenWeatherMap")
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
