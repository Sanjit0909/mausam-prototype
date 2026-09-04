"""Unified marine/tide interface: INCOIS -> Open-Meteo Marine (wave/wind/swell) with
Stormglass layered in ONLY for real tide extremes -> graceful unavailable.

Wave height/wind/swell always come from Open-Meteo Marine when the location has coastal
coverage (free, real, unlimited). Stormglass's scarce 10-requests/day quota is spent only on
the one thing Open-Meteo cannot provide at all: real tide highs/lows. INCOIS is checked first
as the preferred Indian authority and will take over both roles once real access exists.
"""
import logging

from ..config import settings
from ..models.environment import MarineResponse
from . import incois, stormglass
from .marine import get_marine as get_open_meteo_marine

logger = logging.getLogger(__name__)


async def get_marine(lat: float, lon: float, name: str | None = None) -> MarineResponse:
    if settings.has_incois_key:
        incois_data = await incois.get_marine_conditions(lat, lon)
        if incois_data.get("available"):
            logger.info("[Marine] INCOIS success")
            # Real INCOIS -> MarineResponse mapping goes here once actual access/docs exist.
    else:
        logger.info("[Marine] INCOIS unavailable (no key configured)")

    result = await get_open_meteo_marine(lat, lon, name)
    if not result.available:
        logger.info("[Marine] Open-Meteo Marine has no coverage here (inland location)")
        return result

    logger.info("[Marine] Open-Meteo Marine success (wave/wind/swell)")

    if settings.has_stormglass_key:
        real_tides = await stormglass.get_tide_extremes(lat, lon)
        if real_tides:
            result.tides = real_tides
            result.is_demo_tide = False
        else:
            logger.info("[Marine] Stormglass tides unavailable; keeping labeled demo tide data")
    else:
        logger.info("[Marine] Stormglass unavailable (no key configured); keeping labeled demo tide data")

    return result
