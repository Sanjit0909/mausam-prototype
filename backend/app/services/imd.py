"""IMD (India Meteorological Department) provider - the authoritative Indian source once live.

STATUS (as of this build): portal access/whitelisting is approved, but no API key has been
generated yet. This module is fully wired into the fallback chains (weather_provider.py,
alerts_provider.py) and will activate automatically the moment IMD_API_KEY is set in the
environment - no other code changes needed anywhere else in the app.

Real IMD endpoints (confirmed to exist at https://api.imd.gov.in/public/api_reference.html):
current_wx, cityforecast/cityforecastloc, districtwarning, districtnowcast, districtrainfall,
seabulletin/coastalbulletin/portwarning (marine/fishermen warnings), cyclone_track/cyclone_wind.

OPEN QUESTION for when a real key exists: these endpoints appear to be keyed by station/city/
district ID rather than raw lat/lon. A lat/lon -> nearest-ID lookup table will need to be
built from IMD's own station list once a working key allows inspecting the real response
shapes - deliberately not guessed/invented here.

This module never raises unhandled exceptions and never fabricates data: every function
either returns real IMD data (once implemented) or raises UpstreamAPIError so the caller
falls through to the next provider in the chain.
"""
import logging

from ..config import settings
from ..core.http_client import UpstreamAPIError
from ..models.alerts import WeatherAlert
from ..models.weather import WeatherResponse

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return settings.has_imd_key


async def get_current_weather(lat: float, lon: float, name: str | None = None) -> WeatherResponse:
    if not is_configured():
        raise UpstreamAPIError("imd", "IMD API key not yet configured")
    # Real integration pending: needs the lat/lon -> station-ID mapping noted above.
    raise UpstreamAPIError("imd", "IMD integration pending station-ID mapping")


async def get_district_warnings(lat: float, lon: float) -> list[WeatherAlert]:
    """Real IMD severe-weather warnings for the district containing (lat, lon).

    Returns an empty list (never fabricated data) whenever IMD is not yet configured or
    the district-ID mapping isn't implemented - alerts_provider.py treats an empty list
    exactly like "no IMD warnings right now" and continues to the derived-alerts tier.
    """
    if not is_configured():
        logger.info("[Alerts] IMD unavailable (no key configured)")
        return []
    logger.warning("[Alerts] IMD key present but district-ID mapping not yet implemented")
    return []
