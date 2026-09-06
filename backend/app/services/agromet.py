"""Official IMD agriculture / Agromet advisory provider interface.

IMD's public API reference lists "Agromet Advisory API" entries that map to city
forecast products (cityforecast / cityforecastloc), not crop-stage Meghdoot/KALP
bulletins. Meghdoot and KALP are portal/app products requiring organizational
access; there is no soil-moisture observation field in the currently configured
IMD endpoints used by this prototype.

This module:
- Never invents official crop advisories
- Returns a clear unavailable status when official data cannot be retrieved
- Leaves a clean hook for future authenticated Agromet/Meghdoot integration
"""
from __future__ import annotations

import logging

from ..config import settings
from ..models.persona import AgrometAdvisoryStatus, FarmerProfile

logger = logging.getLogger(__name__)

# Optional future endpoint override (not present in current credentials scope).
# Example if IMD grants a crop-advisory path: /api/v1/agromet_advisory
_AGROMET_PATH_ENV = "imd_agromet_advisory_path"


def is_official_agromet_configured() -> bool:
    """True only when credentials exist AND an explicit advisory path is configured."""
    path = getattr(settings, _AGROMET_PATH_ENV, "") or ""
    return settings.has_imd_credentials and bool(str(path).strip())


async def fetch_official_agromet_advisory(
    lat: float,
    lon: float,
    farmer: FarmerProfile | None = None,
    locale: str = "en",
) -> AgrometAdvisoryStatus:
    """Attempt official Agromet advisory. Currently returns honest unavailable state.

    Do not scrape KALP/Meghdoot HTML. When IMD grants an API path, implement the
    HTTP call here and populate advisory fields with provenance timestamps.
    """
    _ = (lat, lon, locale)  # reserved for future request params
    crop = farmer.crop if farmer else None
    stage = farmer.crop_stage if farmer else None

    if not settings.has_imd_credentials:
        return AgrometAdvisoryStatus(
            available=False,
            status="not_configured",
            message=(
                "IMD credentials are not fully configured for Agromet crop advisories. "
                "Use the official KALP portal for crop-stage advisories. "
                "MAUSAM weather-based farm cards below are derived, not official IMD advisories."
            ),
            crop_relevance=crop,
            crop_stage_relevance=stage,
            portal_url="https://webgis.imd.gov.in/agro",
        )

    if not is_official_agromet_configured():
        logger.info(
            "[Agromet] IMD credentials present but no Agromet crop-advisory API path configured; "
            "returning unavailable (not fabricating advisory)."
        )
        return AgrometAdvisoryStatus(
            available=False,
            status="unavailable",
            message=(
                "Official IMD Meghdoot/KALP crop advisory API is not wired into this deployment. "
                "District weather warnings from IMD remain available separately. "
                "Farm cards below are MAUSAM-derived from live weather and are not labelled as IMD advisories."
            ),
            crop_relevance=crop,
            crop_stage_relevance=stage,
            portal_url="https://webgis.imd.gov.in/agro",
            source_label="IMD Agromet (not connected)",
        )

    # Future: authenticated GET to configured path. Keep unavailable until implemented.
    return AgrometAdvisoryStatus(
        available=False,
        status="unavailable",
        message="Agromet advisory endpoint configured but not yet implemented.",
        crop_relevance=crop,
        crop_stage_relevance=stage,
    )
