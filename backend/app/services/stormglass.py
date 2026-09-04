"""Stormglass marine provider - used ONLY for real tide extremes.

CRITICAL CONSTRAINT: this API key's free plan allows just 10 requests/day total. It is
therefore used for exactly one thing Open-Meteo Marine cannot provide at all (real tide
highs/lows), never for wave height/wind/swell (Open-Meteo Marine already gives those for
free with no request limit). Cached for 12 hours per location to make the quota last through
an entire demo day covering multiple coastal locations.

Do not add more Stormglass calls without re-checking the daily quota math.
"""
import logging
from datetime import datetime, timedelta, timezone

from ..config import settings
from ..core.cache import TTLCache, location_key
from ..core.http_client import get_http_client
from ..models.environment import TideEvent

logger = logging.getLogger(__name__)

TIDE_URL = "https://api.stormglass.io/v2/tide/extremes/point"

# 12h TTL: tide patterns are stable enough that this is a reasonable trade against a
# 10-requests/day budget - roughly 2 unique coastal locations/day fully covered.
_cache = TTLCache(ttl_seconds=12 * 3600)


async def get_tide_extremes(lat: float, lon: float) -> list[TideEvent] | None:
    """Returns real tide extremes for the next 24h, or None if unavailable/exhausted.

    Never raises - marine data is secondary and Stormglass's quota is too precious to risk
    retries against, so this makes exactly one attempt and reports the outcome via logging.
    """
    if not settings.has_stormglass_key:
        return None

    key = f"stormglass-tides:{location_key(lat, lon)}"
    cached = _cache.get(key)
    if cached is not None:
        logger.info("[Marine] Stormglass tide cache hit for %s", key)
        return cached

    client = get_http_client()
    now = datetime.now(timezone.utc)
    try:
        resp = await client.get(
            TIDE_URL,
            params={
                "lat": lat,
                "lng": lon,
                "start": now.isoformat(),
                "end": (now + timedelta(hours=30)).isoformat(),
            },
            headers={"Authorization": settings.stormglass_api_key},
        )
        if resp.status_code == 402:
            logger.warning("[Marine] Stormglass daily quota exhausted (10/day free tier)")
            return None
        resp.raise_for_status()
        data = resp.json()
    except Exception:  # noqa: BLE001 - never let a scarce, rate-limited provider break the app
        logger.warning("[Marine] Stormglass tide request failed")
        return None

    events = [
        TideEvent(type=item["type"], time=item["time"], height=round(item["height"], 2))
        for item in data.get("data", [])
    ]
    if events:
        _cache.set(key, events)
        logger.info("[Marine] Stormglass tide success (%d events, cached 12h)", len(events))
    return events or None
