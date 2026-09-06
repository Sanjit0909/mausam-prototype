"""Marine/wave adapter backed by Open-Meteo's free Marine API (no key required).

Tide highs/lows are NOT fabricated here. Stormglass (via marine_provider) supplies real
tide extremes when available. Open-Meteo Marine returns modelled wave/swell/current/SST
fields only — clearly labelled as model data, never as official INCOIS observations.
"""
from __future__ import annotations

from ..core.cache import TTLCache, location_key
from ..core.http_client import get_with_backoff
from ..models.common import LocationInfo
from ..models.environment import MarineConditions, MarineResponse

MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

# Only request fields documented by Open-Meteo Marine. Missing values stay null.
HOURLY_VARS = (
    "wave_height,wave_direction,wave_period,"
    "swell_wave_height,swell_wave_direction,swell_wave_period,"
    "wind_wave_height,wind_wave_direction,wind_wave_period,"
    "ocean_current_velocity,ocean_current_direction,"
    "sea_surface_temperature,sea_level_height_msl"
)

_cache = TTLCache(ttl_seconds=1800)

_FIELD_KEYS = (
    "wave_height",
    "wave_direction",
    "wave_period",
    "swell_wave_height",
    "swell_wave_direction",
    "swell_wave_period",
    "wind_wave_height",
    "wind_wave_direction",
    "wind_wave_period",
    "ocean_current_velocity",
    "ocean_current_direction",
    "sea_surface_temperature",
    "sea_level_height_msl",
)


def _first_number(values: list | None) -> float | None:
    if not values:
        return None
    for v in values:
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                continue
    return None


def parse_marine_hourly(hourly: dict) -> tuple[MarineConditions, dict[str, bool]]:
    """Parse Open-Meteo hourly marine block. Pure function for unit tests."""
    kwargs = {key: _first_number(hourly.get(key)) for key in _FIELD_KEYS}
    availability = {key: kwargs[key] is not None for key in _FIELD_KEYS}
    return MarineConditions(**kwargs), availability


async def get_marine(lat: float, lon: float, name: str | None = None) -> MarineResponse:
    key = f"marine:{location_key(lat, lon)}"

    async def _fetch() -> dict | None:
        try:
            resp = await get_with_backoff(
                MARINE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": HOURLY_VARS,
                    "timezone": "auto",
                    "forecast_days": 3,
                },
            )
            return resp.json()
        except Exception:  # noqa: BLE001 - marine is secondary; never break the app over it
            return None

    raw = await _cache.get_or_set(key, _fetch)
    location = LocationInfo(name=name or "Selected location", lat=lat, lon=lon)

    if not raw or "hourly" not in raw:
        return MarineResponse(
            location=location,
            available=False,
            current=None,
            tides=[],
            is_demo_tide=False,
            source="unavailable",
            wave_source=None,
            tide_source=None,
            incois_status="unavailable",
            provider_label="Marine model unavailable for this location",
        )

    current, availability = parse_marine_hourly(raw["hourly"])
    has_real_data = any(availability.values())

    if not has_real_data:
        # Open-Meteo's marine model has no coverage inland - this is expected, not an error.
        return MarineResponse(
            location=location,
            available=False,
            current=None,
            tides=[],
            is_demo_tide=False,
            source="unavailable",
            wave_source=None,
            tide_source=None,
            incois_status="unavailable",
            provider_label="Open-Meteo Marine has no coverage here",
        )

    return MarineResponse(
        location=location,
        available=True,
        current=current,
        tides=[],  # No fabricated demo tides — Stormglass fills real extremes when available.
        is_demo_tide=False,
        source="open-meteo-marine",
        wave_source="Open-Meteo Marine (model)",
        tide_source=None,
        incois_status="unavailable",
        provider_label="Open-Meteo Marine – Model forecast (not official observations)",
        field_availability=availability,
    )
