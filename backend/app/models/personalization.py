from pydantic import BaseModel

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
