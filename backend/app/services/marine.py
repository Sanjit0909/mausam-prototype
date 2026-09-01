"""Marine/wave adapter backed by Open-Meteo's free Marine API (no key required).

Tide highs/lows have no free, reliable, keyless public API (INCOIS has no public JSON API;
WorldTides/StormGlass require paid keys) - they are returned as clearly-flagged demo data
(`is_demo_tide=True`) so the UI can be demonstrated without misrepresenting them as real
observations, per the "never present fabricated data as real" rule.
"""
from ..core.cache import TTLCache, location_key
from ..core.http_client import get_http_client
from ..models.common import LocationInfo
from ..models.environment import MarineConditions, MarineResponse, TideEvent

MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
HOURLY_VARS = "wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period"

_cache = TTLCache(ttl_seconds=1800)

_DEMO_TIDES = [
    TideEvent(type="high", time="06:12", height=1.4),
    TideEvent(type="low", time="12:34", height=0.3),
    TideEvent(type="high", time="18:47", height=1.6),
    TideEvent(type="low", time="00:58", height=0.4),
]


async def get_marine(lat: float, lon: float, name: str | None = None) -> MarineResponse:
    key = f"marine:{location_key(lat, lon)}"

    async def _fetch() -> dict | None:
        client = get_http_client()
        try:
            resp = await client.get(
                MARINE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "hourly": HOURLY_VARS,
                    "timezone": "auto",
                    "forecast_days": 3,
                },
            )
            resp.raise_for_status()
            return resp.json()
        except Exception:  # noqa: BLE001 - marine is secondary; never break the app over it
            return None

    raw = await _cache.get_or_set(key, _fetch)
    location = LocationInfo(name=name or "Selected location", lat=lat, lon=lon)

    wave_heights = (raw or {}).get("hourly", {}).get("wave_height", []) if raw else []
    has_real_data = raw is not None and any(v is not None for v in wave_heights)

    if not has_real_data:
        # Open-Meteo's marine model has no coverage inland - this is expected, not an error.
        return MarineResponse(location=location, available=False, current=None, tides=[], source="unavailable")

    hourly = raw["hourly"]
    current = MarineConditions(
        wave_height=next((v for v in hourly.get("wave_height", []) if v is not None), None),
        wave_direction=next((v for v in hourly.get("wave_direction", []) if v is not None), None),
        wave_period=next((v for v in hourly.get("wave_period", []) if v is not None), None),
        swell_wave_height=next((v for v in hourly.get("swell_wave_height", []) if v is not None), None),
        swell_wave_direction=next((v for v in hourly.get("swell_wave_direction", []) if v is not None), None),
        swell_wave_period=next((v for v in hourly.get("swell_wave_period", []) if v is not None), None),
    )

    return MarineResponse(
        location=location,
        available=True,
        current=current,
        tides=_DEMO_TIDES,
        is_demo_tide=True,
        source="open-meteo-marine",
    )
