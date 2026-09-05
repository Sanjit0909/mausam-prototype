"""Unified severe weather alerts: IMD (India, authoritative once live) + NWS (US) + rule-based
derived alerts. IMD/NWS are "official" sources; derived alerts are always included too as a
safety net (never solely relied on an official source's absence to mean "nothing to report").
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from ..models.alerts import WeatherAlert
from .imd_districts import ImdDistrictAlertsResult, fetch_district_alerts
from .nws_alerts import fetch_nws_alerts

logger = logging.getLogger(__name__)


@dataclass
class OfficialAlertsBundle:
    alerts: list[WeatherAlert] = field(default_factory=list)
    imd: ImdDistrictAlertsResult | None = None


async def get_official_alerts_bundle(lat: float, lon: float) -> OfficialAlertsBundle:
    """Official alerts plus IMD district provenance for AlertsResponse metadata."""
    imd_result = await fetch_district_alerts(lat, lon)
    if imd_result.alerts:
        logger.info("[Alerts] IMD returned %d official warning(s)", len(imd_result.alerts))
    elif imd_result.status not in {"not_configured", "ok_no_active"}:
        logger.info("[Alerts] IMD district status=%s", imd_result.status)

    nws_alerts = await fetch_nws_alerts(lat, lon)
    if nws_alerts:
        logger.info("[Alerts] NWS returned %d official alert(s)", len(nws_alerts))

    return OfficialAlertsBundle(alerts=imd_result.alerts + nws_alerts, imd=imd_result)


async def get_official_alerts(lat: float, lon: float) -> list[WeatherAlert]:
    """Real official alerts from whichever authoritative source applies to this location."""
    bundle = await get_official_alerts_bundle(lat, lon)
    return bundle.alerts
