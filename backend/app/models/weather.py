"""Normalized weather/forecast schemas - the app never passes raw provider JSON to the frontend."""
from pydantic import BaseModel, Field

from .common import LocationInfo


class FieldProvenance(BaseModel):
    """Per-field value provenance after field-level provider fallback."""

    value: float | None = None
    source: str | None = None  # IMD | Open-Meteo | Weatherstack | ...
    category: str = "Unavailable"  # Official | Model | Weatherstack | Derived | Estimated | Unavailable


class CurrentWeather(BaseModel):
    temperature: float
    feels_like: float
    condition: str
    condition_code: int
    condition_group: str  # clear | cloudy | fog | drizzle | rain | snow | storm
    is_day: bool
    # Optional numerics: None means unavailable after all provider fallbacks.
    humidity: float | None = None
    wind_speed: float | None = None
    wind_direction: float | None = None
    pressure: float | None = None
    precipitation: float | None = None
    uv_index: float | None = None
    visibility: float | None = None
    observed_at: str
    # Echo of WeatherResponse.field_sources for clients that only read `current`.
    field_sources: dict[str, dict] = Field(default_factory=dict)


class HourlyPoint(BaseModel):
    time: str
    temperature: float
    precipitation_probability: float | None = None
    condition_code: int
    condition_group: str
    wind_speed: float | None = None
    uv_index: float | None = None
    visibility: float | None = None


class DailyPoint(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    precipitation_probability_max: float | None = None
    condition_code: int
    condition_group: str
    sunrise: str | None = None
    sunset: str | None = None
    uv_index_max: float | None = None


class WeatherResponse(BaseModel):
    location: LocationInfo
    current: CurrentWeather
    source: str = "open-meteo"
    is_demo: bool = False
    # Optional IMD observation provenance (ignored by older clients).
    provider_label: str | None = None
    observation_station: str | None = None
    observation_station_id: str | None = None
    station_distance_km: float | None = None
    # Field-level provenance after IMD → Open-Meteo → Weatherstack merge.
    field_sources: dict[str, FieldProvenance] = Field(default_factory=dict)


class ForecastResponse(BaseModel):
    location: LocationInfo
    hourly: list[HourlyPoint]
    daily: list[DailyPoint]
    source: str = "open-meteo"
    is_demo: bool = False
    provider_label: str | None = None
