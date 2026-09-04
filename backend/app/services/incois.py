"""INCOIS (Indian National Centre for Ocean Information Services) - preferred Indian marine source.

STATUS (as of this build): API access has not been requested/received yet. Per project
requirements, this returns the explicit "unavailable" shape below rather than any invented
or mock data. Once real, documented API access exists, replace the body of
get_marine_conditions() with the actual integration - marine_provider.py's calling contract
does not need to change.
"""
from ..config import settings


def is_configured() -> bool:
    return settings.has_incois_key


async def get_marine_conditions(lat: float, lon: float) -> dict:
    if not is_configured():
        return {
            "available": False,
            "source": "INCOIS",
            "message": "Official INCOIS marine data unavailable for this location",
        }
    # Real integration pending actual API documentation/access - intentionally not guessed.
    return {
        "available": False,
        "source": "INCOIS",
        "message": "INCOIS integration pending API documentation",
    }
