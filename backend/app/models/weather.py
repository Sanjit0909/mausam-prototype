"""Normalized weather/forecast schemas - the app never passes raw provider JSON to the frontend."""
from pydantic import BaseModel

from .common import LocationInfo


class CurrentWeather(BaseModel):
    temperature: float
    feels_like: float
    condition: str
    condition_code: int
    condition_group: str  # clear | cloudy | fog | drizzle | rain | snow | storm
    is_day: bool
    humidity: float
    wind_speed: float
    wind_direction: float
    pressure: float
    precipitation: float = 0
    uv_index: float | None = None
    visibility: float | None = None
    observed_at: str


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


class ForecastResponse(BaseModel):
    location: LocationInfo
    hourly: list[HourlyPoint]
    daily: list[DailyPoint]
    source: str = "open-meteo"
    is_demo: bool = False
