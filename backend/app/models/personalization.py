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
)


class PersonalizedInsight(BaseModel):
    message: str
    icon: str = "info"
    priority: int = 0


class RecommendationCard(BaseModel):
    interest: str
    title: str
    description: str
    icon: str = "sparkles"


class InsightsResponse(BaseModel):
    card_order: list[str]
    insights: list[PersonalizedInsight]
    recommendations: list[RecommendationCard]
