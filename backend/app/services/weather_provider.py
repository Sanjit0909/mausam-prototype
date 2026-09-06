"""Unified weather/forecast interface with field-level provider fallback.

Current weather chain (per field independently — never whole-provider replacement):
  IMD (official) → Open-Meteo (model) → OpenWeatherMap (model) → Weatherstack

Each numeric field is taken from the first provider that returns a valid value for that field.
Forecast remains Open-Meteo → OpenWeatherMap (not IMD) and must not be labelled official IMD.
"""
from __future__ import annotations

import logging
import time

from ..config import settings
from ..core.http_client import UpstreamAPIError
from ..models.weather import ForecastResponse, WeatherResponse
from . import imd, open_meteo, openweathermap, weatherstack
from .weather_fields import (
    SOURCE_IMD,
    SOURCE_OPEN_METEO,
    SOURCE_OWM,
    SOURCE_WEATHERSTACK,
    ProviderSnapshot,
    build_merged_weather_response,
)

logger = logging.getLogger(__name__)


async def _try_provider(name: str, coro) -> ProviderSnapshot:
    started = time.monotonic()
    try:
        result = await coro
        logger.info("[Weather] %s success (%.2fs)", name, time.monotonic() - started)
        return ProviderSnapshot(provider=name, response=result)
    except Exception as exc:  # noqa: BLE001
        detail = getattr(exc, "message", None) or str(exc)
        # Never log keys/headers/.env — exception type + short message only.
        logger.info(
            "[Weather] %s unavailable (%.2fs, %s: %s)",
            name,
            time.monotonic() - started,
            type(exc).__name__,
            detail[:200],
        )
        return ProviderSnapshot(provider=name, error=f"{type(exc).__name__}: {detail[:200]}")


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    snapshots: list[ProviderSnapshot] = []

    if settings.has_imd_credentials:
        snapshots.append(await _try_provider(SOURCE_IMD, imd.get_current_weather(lat, lon, name)))
    else:
        logger.info("[Weather] IMD skipped (credentials not configured)")

    snapshots.append(await _try_provider(SOURCE_OPEN_METEO, open_meteo.get_current_weather(lat, lon, name)))

    # OpenWeatherMap is an intentional field-level rung (pressure, visibility, wind, etc.).
    if settings.has_owm_key:
        snapshots.append(await _try_provider(SOURCE_OWM, openweathermap.get_current_weather(lat, lon, name)))

    if settings.has_weatherstack_key:
        snapshots.append(
            await _try_provider(SOURCE_WEATHERSTACK, weatherstack.get_current_weather(lat, lon, name))
        )

    # Field order: IMD → Open-Meteo → OpenWeatherMap → Weatherstack
    order = {SOURCE_IMD: 0, SOURCE_OPEN_METEO: 1, SOURCE_OWM: 2, SOURCE_WEATHERSTACK: 3}
    snapshots.sort(key=lambda s: order.get(s.provider, 99))

    if not any(s.ok for s in snapshots):
        # Preserve previous behaviour: re-raise Open-Meteo failure as the last resort signal.
        return await open_meteo.get_current_weather(lat, lon, name)

    try:
        merged = build_merged_weather_response(snapshots, lat=lat, lon=lon, name=name)
        used = {
            (merged.field_sources or {}).get(k).source
            for k in ("temperature", "humidity", "pressure", "wind_speed", "uv_index", "visibility")
            if (merged.field_sources or {}).get(k) and (merged.field_sources or {}).get(k).source
        }
        logger.info("[Weather] field-merge sources=%s label=%s", sorted(used), merged.provider_label)
        return merged
    except Exception as exc:  # noqa: BLE001
        logger.warning("[Weather] field-merge failed (%s); using first successful provider", type(exc).__name__)
        for snap in snapshots:
            if snap.ok and snap.response is not None:
                return snap.response
        raise UpstreamAPIError("weather", "Weather data is temporarily unavailable") from exc


async def get_forecast(lat: float, lon: float, days: int = 7, name: str | None = None) -> ForecastResponse:
    # IMD forecast is not wired — never label this as official IMD.
    try:
        result = await open_meteo.get_forecast(lat, lon, days, name)
        return result.model_copy(
            update={
                "source": "open-meteo",
                "provider_label": "Open-Meteo – Model Forecast (not IMD)",
            }
        )
    except Exception:  # noqa: BLE001
        if not settings.has_owm_key:
            raise
        logger.warning("[Forecast] Open-Meteo failed; falling back to OpenWeatherMap")
        result = await openweathermap.get_forecast(lat, lon, days, name)
        return result.model_copy(
            update={
                "source": "openweathermap",
                "provider_label": "OpenWeatherMap – Model Forecast (not IMD)",
            }
        )


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
