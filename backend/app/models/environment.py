"""Schemas for AQI, marine, astronomy, and historical data."""
from pydantic import BaseModel

from .common import LocationInfo


class AirQualityResponse(BaseModel):
    location: LocationInfo
    us_aqi: int | None = None
    european_aqi: int | None = None
    category: str
    pm2_5: float | None = None
    pm10: float | None = None
    ozone: float | None = None
    nitrogen_dioxide: float | None = None
    sulphur_dioxide: float | None = None
    carbon_monoxide: float | None = None
    source: str = "open-meteo"


class MarineConditions(BaseModel):
    wave_height: float | None = None
    wave_direction: float | None = None
    wave_period: float | None = None
    swell_wave_height: float | None = None
    swell_wave_direction: float | None = None
    swell_wave_period: float | None = None


class TideEvent(BaseModel):
    type: str  # "high" | "low"
    time: str
    height: float | None = None


class MarineResponse(BaseModel):
    location: LocationInfo
    available: bool = True
    current: MarineConditions | None = None
    tides: list[TideEvent] = []
    is_demo_tide: bool = True
    source: str = "open-meteo-marine"


class AstronomyResponse(BaseModel):
    location: LocationInfo
    date: str
    sunrise: str | None = None
    sunset: str | None = None
    moonrise: str | None = None
    moonset: str | None = None
    moon_phase: str
    moon_illumination: float
    is_moon_approx: bool = True
    source: str = "open-meteo + computed"


class HistoricalPoint(BaseModel):
    date: str
    temp_max: float | None = None
    temp_min: float | None = None
    precipitation: float | None = None


class HistoricalResponse(BaseModel):
    location: LocationInfo
    data: list[HistoricalPoint]
    source: str = "open-meteo-archive"
