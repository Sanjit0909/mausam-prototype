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
from .persona_locale import agromet_unavailable_message, t

logger = logging.getLogger(__name__)

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
    """Attempt official Agromet advisory. Currently returns honest unavailable state."""
    _ = (lat, lon)  # reserved for future request params
    crop = farmer.crop if farmer else None
    stage = farmer.crop_stage if farmer else None

    if not settings.has_imd_credentials:
        return AgrometAdvisoryStatus(
            available=False,
            status="not_configured",
            message=agromet_unavailable_message(locale, configured_creds=False),
            crop_relevance=crop,
            crop_stage_relevance=stage,
            portal_url="https://webgis.imd.gov.in/agro",
            language=locale,
        )

    if not is_official_agromet_configured():
        logger.info(
            "[Agromet] IMD credentials present but no Agromet crop-advisory API path configured; "
            "returning unavailable (not fabricating advisory)."
        )
        return AgrometAdvisoryStatus(
            available=False,
            status="unavailable",
            message=agromet_unavailable_message(locale, configured_creds=True),
            crop_relevance=crop,
            crop_stage_relevance=stage,
            portal_url="https://webgis.imd.gov.in/agro",
            source_label=t(locale, "IMD Agromet (not connected)", "IMD एग्रोमेट (कनेक्ट नहीं)"),
            language=locale,
        )

    return AgrometAdvisoryStatus(
        available=False,
        status="unavailable",
        message=t(
            locale,
            "Agromet advisory endpoint configured but not yet implemented.",
            "Agromet सलाह एंडपॉइंट कॉन्फ़िगर है, पर अभी लागू नहीं किया गया है।",
        ),
        crop_relevance=crop,
        crop_stage_relevance=stage,
        language=locale,
    )
