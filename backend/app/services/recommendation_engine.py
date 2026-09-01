"""Rule-based personalization engine (Phase 4 of the plan).

Deliberately simple, explainable, dependency-free logic - the function signatures below
are the intended "seam" for swapping in a learned/ML recommender later without touching
any caller (routers just call build_insights_response()).
"""
from datetime import datetime

from ..models.environment import AirQualityResponse
from ..models.personalization import InsightsResponse, PersonalizedInsight, RecommendationCard
from ..models.weather import ForecastResponse, WeatherResponse

INTEREST_CARD_PRIORITY: dict[str, list[str]] = {
    "outdoor_fitness": ["temperature", "feels_like", "aqi", "uv_index", "wind", "rain_probability", "forecast"],
    "travel": ["forecast", "rain_probability", "alerts", "packing_suggestion", "temperature"],
    "family": ["commute_conditions", "rain_alert", "temp_extremes", "alerts", "uv_index"],
    "agriculture": ["temperature", "rainfall", "humidity", "trend_chart", "wind"],
    "marine_beach": ["wave_height", "wind", "marine_conditions", "tide", "uv_index"],
    "commuting": ["rain_probability", "wind", "visibility", "alerts", "temperature"],
    "events": ["forecast", "rain_probability", "temperature", "wind", "comfort"],
    "health": ["aqi", "uv_index", "humidity", "temperature", "feels_like"],
}

DEFAULT_CARD_ORDER = [
    "temperature",
    "feels_like",
    "humidity",
    "wind",
    "pressure",
    "visibility",
    "rain_probability",
    "uv_index",
    "aqi",
    "forecast",
]


def compute_card_order(interests: list[str]) -> list[str]:
    """Scores every card by how many/which selected interests prioritize it, then sorts.

    Cards favored by an interest get more weight the earlier they appear in that
    interest's own priority list (a simple, transparent scoring rule fit for a prototype).
    """
    if not interests:
        return DEFAULT_CARD_ORDER

    scores: dict[str, float] = {}
    for interest in interests:
        priority_list = INTEREST_CARD_PRIORITY.get(interest, [])
        for i, card in enumerate(priority_list):
            scores[card] = scores.get(card, 0) + (len(priority_list) - i)

    for i, card in enumerate(DEFAULT_CARD_ORDER):
        scores.setdefault(card, 0)
        scores[card] += (len(DEFAULT_CARD_ORDER) - i) * 0.01  # tie-breaker only

    return sorted(scores.keys(), key=lambda c: scores[c], reverse=True)


def generate_insights(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
) -> list[PersonalizedInsight]:
    insights: list[PersonalizedInsight] = []
    current = weather.current
    hour = datetime.now().hour
    interest_set = set(interests)
    outdoor_relevant = bool(interest_set & {"outdoor_fitness", "health", "events", "family"}) or not interests

    if air_quality is not None and air_quality.us_aqi is not None and air_quality.us_aqi > 150 and outdoor_relevant:
        insights.append(
            PersonalizedInsight(
                message=f"Air quality is {air_quality.category.lower()} (AQI {air_quality.us_aqi}) — consider indoor exercise today.",
                icon="wind",
                priority=9,
            )
        )
    elif current.uv_index is not None and current.uv_index >= 7 and hour < 16 and outdoor_relevant:
        insights.append(
            PersonalizedInsight(
                message="High UV today — outdoor activity is safer before 10 AM or after 4 PM.",
                icon="sun",
                priority=8,
            )
        )
    elif current.uv_index is not None and current.uv_index < 4 and "outdoor_fitness" in interest_set:
        insights.append(
            PersonalizedInsight(message="Good time for outdoor exercise — UV and conditions look favorable.", icon="activity", priority=5)
        )

    if forecast is not None and forecast.hourly:
        evening_points = [h for h in forecast.hourly if h.time[11:13].isdigit() and 17 <= int(h.time[11:13]) <= 21]
        max_evening_rain = max((h.precipitation_probability or 0 for h in evening_points), default=0)
        if max_evening_rain >= 50:
            insights.append(
                PersonalizedInsight(message="Carry an umbrella after 6 PM — rain is likely this evening.", icon="umbrella", priority=7)
            )

    if current.temperature >= 35 and (interest_set & {"outdoor_fitness", "agriculture", "events", "family"} or not interests):
        insights.append(
            PersonalizedInsight(
                message=f"It's {current.temperature:.0f}\u00b0C — stay hydrated and avoid peak midday sun.", icon="thermometer", priority=6
            )
        )

    if "marine_beach" in interest_set and current.wind_speed >= 30:
        insights.append(
            PersonalizedInsight(
                message=f"Winds at {current.wind_speed:.0f} km/h — check local advisories before heading out on the water.",
                icon="wind",
                priority=6,
            )
        )

    if "agriculture" in interest_set and current.temperature <= 5:
        insights.append(
            PersonalizedInsight(message="Low temperatures tonight — consider frost protection for sensitive crops.", icon="snowflake", priority=7)
        )

    if not insights:
        insights.append(
            PersonalizedInsight(message=f"Conditions in {weather.location.name} look stable — a good day to plan ahead.", icon="check-circle", priority=1)
        )

    return sorted(insights, key=lambda i: i.priority, reverse=True)


def generate_recommendations(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    interests: list[str],
) -> list[RecommendationCard]:
    current = weather.current
    cards: list[RecommendationCard] = []
    rain_soon = bool(forecast and forecast.hourly and any((h.precipitation_probability or 0) >= 50 for h in forecast.hourly[:6]))

    if "outdoor_fitness" in interests:
        best_time = "early morning (6-8 AM)" if current.temperature > 28 else "any time today"
        cards.append(
            RecommendationCard(
                interest="outdoor_fitness",
                title="Best Time to Exercise",
                description=f"{best_time} looks most comfortable based on current temperature and UV.",
                icon="activity",
            )
        )

    if "travel" in interests:
        note = "Pack a compact umbrella or raincoat." if rain_soon or current.condition_group in ("rain", "drizzle", "storm") else "Pack light — no rain expected right now."
        cards.append(RecommendationCard(interest="travel", title="Packing Suggestion", description=note, icon="briefcase"))

    if "family" in interests:
        note = "Roads look clear for the school commute." if current.condition_group in ("clear", "cloudy") else f"Expect {current.condition.lower()} during commute hours — plan extra time."
        cards.append(RecommendationCard(interest="family", title="School Commute", description=note, icon="users"))

    if "agriculture" in interests:
        cards.append(
            RecommendationCard(
                interest="agriculture",
                title="Field Conditions",
                description=f"Humidity at {current.humidity:.0f}% and {current.condition.lower()} — monitor soil moisture before irrigating.",
                icon="sprout",
            )
        )

    if "marine_beach" in interests:
        cards.append(
            RecommendationCard(
                interest="marine_beach",
                title="Beach & Marine Outlook",
                description=f"Wind at {current.wind_speed:.0f} km/h. Check the Marine card for wave conditions.",
                icon="waves",
            )
        )

    if "commuting" in interests:
        visibility_ok = (current.visibility or 10) >= 5
        cards.append(
            RecommendationCard(
                interest="commuting",
                title="Commute Outlook",
                description="Clear visibility expected." if visibility_ok else "Reduced visibility — allow extra travel time.",
                icon="car",
            )
        )

    if "events" in interests:
        comfortable = 18 <= current.feels_like <= 30
        cards.append(
            RecommendationCard(
                interest="events",
                title="Outdoor Event Comfort",
                description=(
                    f"Feels like {current.feels_like:.0f}\u00b0C — comfortable for an outdoor event."
                    if comfortable
                    else f"Feels like {current.feels_like:.0f}\u00b0C — plan for extra shade/heating and check the hourly forecast."
                ),
                icon="calendar",
            )
        )

    if "health" in interests:
        uv = current.uv_index or 0
        cards.append(
            RecommendationCard(
                interest="health",
                title="Health Advisory",
                description=f"UV index {uv:.0f}, humidity {current.humidity:.0f}%. {'Stay hydrated.' if current.temperature > 30 else 'Conditions are comfortable.'}",
                icon="heart",
            )
        )

    return cards


def build_insights_response(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
) -> InsightsResponse:
    return InsightsResponse(
        card_order=compute_card_order(interests),
        insights=generate_insights(weather, forecast, air_quality, interests),
        recommendations=generate_recommendations(weather, forecast, interests),
    )
