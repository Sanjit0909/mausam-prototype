"""Unified severe weather alerts: IMD (India, authoritative once live) + NWS (US) + rule-based
derived alerts. IMD/NWS are "official" sources; derived alerts are always included too as a
safety net (never solely relied on an official source's absence to mean "nothing to report").
"""
import logging

from ..models.alerts import WeatherAlert
from . import imd
from .nws_alerts import fetch_nws_alerts

logger = logging.getLogger(__name__)


async def get_official_alerts(lat: float, lon: float) -> list[WeatherAlert]:
    """Real official alerts from whichever authoritative source applies to this location."""
    imd_alerts = await imd.get_district_warnings(lat, lon)
    if imd_alerts:
        logger.info("[Alerts] IMD returned %d official warning(s)", len(imd_alerts))

    nws_alerts = await fetch_nws_alerts(lat, lon)
    if nws_alerts:
        logger.info("[Alerts] NWS returned %d official alert(s)", len(nws_alerts))

    return imd_alerts + nws_alerts
