from pydantic import BaseModel

from .alerts import AlertsResponse
from .environment import AirQualityResponse, AstronomyResponse, MarineResponse
from .weather import ForecastResponse, WeatherResponse

INTERESTS = (
    "health",
    "outdoor_fitness",
    "travel",
    "family",
    "agriculture",
    "commuting",
    "marine_beach",
    "events",
    "elderly",
)


class PersonalizedInsight(BaseModel):
    message: str
    icon: str = "info"
    priority: int = 0
    reason: str = ""  # powers the "Why this?" affordance
    label: str = "Weather-based recommendation"  # never claims to be an official advisory


class RecommendationCard(BaseModel):
    interest: str
    title: str
    description: str
    icon: str = "sparkles"
    reason: str = ""
    label: str = "Weather-based recommendation"


class InsightsResponse(BaseModel):
    card_order: list[str]
    card_reasons: dict[str, str] = {}  # card key -> "why this?" reason
    insights: list[PersonalizedInsight]
    recommendations: list[RecommendationCard]


class HomeResponse(BaseModel):
    """Single-request homepage payload so the UI does not wait on 7 separate RTTs."""
    weather: WeatherResponse
    forecast: ForecastResponse | None = None
    air_quality: AirQualityResponse | None = None
    alerts: AlertsResponse | None = None
    insights: InsightsResponse
    astronomy: AstronomyResponse | None = None
    marine: MarineResponse | None = None
