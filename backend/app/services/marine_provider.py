"""Unified marine/tide interface: INCOIS (if real) -> Open-Meteo Marine + Stormglass tides.

Wave/swell/current/SST: Open-Meteo Marine (model), never labelled INCOIS.
Tide extremes: Stormglass when configured (12h server cache), never labelled INCOIS.
INCOIS: only when a real official response is available (currently stub/unavailable).
"""
import logging

from ..config import settings
from ..models.environment import MarineResponse
from . import incois, stormglass
from .marine import get_marine as get_open_meteo_marine

logger = logging.getLogger(__name__)


async def get_marine(lat: float, lon: float, name: str | None = None) -> MarineResponse:
    incois_status = "unavailable"
    if settings.has_incois_key:
        incois_data = await incois.get_marine_conditions(lat, lon)
        if incois_data.get("available"):
            logger.info("[Marine] INCOIS success")
            incois_status = "available"
            # Real INCOIS -> MarineResponse mapping goes here once actual access/docs exist.
        else:
            incois_status = "unavailable"
            logger.info("[Marine] INCOIS configured but not returning data")
    else:
        logger.info("[Marine] INCOIS unavailable (no key configured)")

    result = await get_open_meteo_marine(lat, lon, name)
    result.incois_status = incois_status

    if not result.available:
        logger.info("[Marine] Open-Meteo Marine has no coverage here (inland location)")
        return result

    logger.info("[Marine] Open-Meteo Marine success (wave/swell/currents when present)")

    if settings.has_stormglass_key:
        # Uses existing 12h coordinate-keyed server cache — do not call from frontend.
        real_tides = await stormglass.get_tide_extremes(lat, lon)
        if real_tides:
            result.tides = real_tides
            result.is_demo_tide = False
            result.tide_source = "Stormglass"
            result.provider_label = (
                "Open-Meteo Marine (model waves) + Stormglass (tide extremes) — not INCOIS"
            )
        else:
            result.tide_source = None
            logger.info("[Marine] Stormglass tides unavailable; no fabricated tide values shown")
    else:
        result.tide_source = None
        logger.info("[Marine] Stormglass unavailable (no key configured); tides omitted")

    return result
