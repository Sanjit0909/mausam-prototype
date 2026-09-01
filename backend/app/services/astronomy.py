"""Astronomy data: real sunrise/sunset (Open-Meteo) + a computed moon phase.

Moonrise/moonset are intentionally omitted rather than estimated - accurate values require a
full lunar ephemeris, which is out of scope for this prototype. Showing a rough guess would
risk presenting inaccurate data as real, which the project explicitly avoids.
"""
import math
from datetime import date, datetime

from ..models.common import LocationInfo
from ..models.environment import AstronomyResponse
from .open_meteo import fetch_raw

SYNODIC_MONTH_DAYS = 29.53058867
KNOWN_NEW_MOON = datetime(2000, 1, 6, 18, 14)

_PHASES: list[tuple[float, str]] = [
    (0.03, "New Moon"),
    (0.22, "Waxing Crescent"),
    (0.28, "First Quarter"),
    (0.47, "Waxing Gibbous"),
    (0.53, "Full Moon"),
    (0.72, "Waning Gibbous"),
    (0.78, "Last Quarter"),
    (0.97, "Waning Crescent"),
]


def compute_moon_phase(d: date) -> tuple[str, float]:
    diff_days = (datetime(d.year, d.month, d.day) - KNOWN_NEW_MOON).total_seconds() / 86400
    position = (diff_days % SYNODIC_MONTH_DAYS) / SYNODIC_MONTH_DAYS
    illumination = round((1 - math.cos(2 * math.pi * position)) / 2 * 100, 1)

    name = "New Moon"
    for threshold, phase_name in _PHASES:
        if position < threshold:
            name = phase_name
            break
    else:
        name = "New Moon"

    return name, illumination


async def get_astronomy(lat: float, lon: float, name: str | None = None) -> AstronomyResponse:
    raw = await fetch_raw(lat, lon, days=1)
    daily = raw.get("daily", {})
    today = date.today()
    phase_name, illumination = compute_moon_phase(today)

    return AstronomyResponse(
        location=LocationInfo(
            name=name or "Selected location",
            lat=raw.get("latitude", lat),
            lon=raw.get("longitude", lon),
            timezone=raw.get("timezone"),
        ),
        date=daily.get("time", [today.isoformat()])[0],
        sunrise=daily.get("sunrise", [None])[0],
        sunset=daily.get("sunset", [None])[0],
        moonrise=None,
        moonset=None,
        moon_phase=phase_name,
        moon_illumination=illumination,
        is_moon_approx=True,
    )
