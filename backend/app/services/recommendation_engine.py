"""Rule-based personalization engine V2 - the core of MAUSAM's "adaptive homepage".

Card ordering is a real multi-factor score, not a static filter:

    score = persona_weight + weather_severity_weight + time_relevance_weight
          + location_relevance_weight + season_relevance_weight + interaction_weight

Every factor below is a small, transparent, rule-based function - no ML, as required. Each
card also gets a `reason` string naming its single biggest contributing factor, powering the
"Why this?" UI (spec section 12).

Safety override (spec section 11) is NOT implemented here: severe alerts are surfaced via
`AlertsResponse.has_severe` and always rendered by the frontend before any of this
personalized content, so personalization can never bury them - this module only orders the
content that follows the alert banner.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from ..models.environment import AirQualityResponse
from ..models.personalization import InsightsResponse, PersonalizedInsight, RecommendationCard
from ..models.weather import ForecastResponse, WeatherResponse

INTEREST_CARD_PRIORITY: dict[str, list[str]] = {
    "outdoor_fitness": ["temperature", "feels_like", "aqi", "uv_index", "wind", "rain_probability", "forecast"],
    "travel": ["forecast", "rain_probability", "alerts", "packing_suggestion", "temperature"],
    "family": ["commute_conditions", "rain_alert", "temp_extremes", "alerts", "uv_index"],
    "agriculture": ["rainfall", "temperature", "humidity", "trend_chart", "wind"],
    "marine_beach": ["wave_height", "wind", "marine_conditions", "tide", "uv_index"],
    "commuting": ["rain_probability", "wind", "visibility", "alerts", "temperature"],
    "events": ["forecast", "rain_probability", "temperature", "wind", "comfort"],
    "health": ["aqi", "uv_index", "humidity", "temperature", "feels_like"],
    "elderly": ["temp_extremes", "aqi", "alerts", "uv_index", "humidity"],
}

INTEREST_LABELS: dict[str, str] = {
    "outdoor_fitness": "Outdoor Fitness",
    "travel": "Traveler",
    "family": "Parent / Family",
    "agriculture": "Farmer / Agriculture",
    "marine_beach": "Fisherman / Marine",
    "commuting": "Commuter",
    "events": "Event Planner",
    "health": "Health-conscious",
    "elderly": "Elderly / Vulnerable",
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

_MONSOON_MONTHS = {6, 7, 8, 9}
_SUMMER_MONTHS = {3, 4, 5, 6}
_WINTER_MONTHS = {11, 12, 1, 2}
IST_OFFSET = timedelta(hours=5, minutes=30)


def now_ist() -> datetime:
    """India has one timezone, no DST - computing this explicitly avoids bugs where the
    server (e.g. Render, which runs in UTC) silently used the wrong "local hour" for
    time-of-day personalization."""
    return datetime.now(timezone.utc) + IST_OFFSET


@dataclass
class ScoringContext:
    interests: list[str]
    current_temp: float
    current_uv: float | None
    current_wind: float
    aqi: int | None
    aqi_category: str
    rain_likely_evening: bool
    has_severe_alert: bool
    local_hour: int
    month: int
    marine_available: bool
    interaction_weights: dict[str, float] = field(default_factory=dict)


def _persona_weight(card: str, interests: list[str]) -> float:
    if not interests:
        try:
            idx = DEFAULT_CARD_ORDER.index(card)
            return (len(DEFAULT_CARD_ORDER) - idx) * 0.5
        except ValueError:
            return 0.0
    score = 0.0
    for interest in interests:
        priority_list = INTEREST_CARD_PRIORITY.get(interest, [])
        if card in priority_list:
            score += (len(priority_list) - priority_list.index(card)) * 2
    return score


def _weather_severity_weight(card: str, ctx: ScoringContext) -> tuple[float, str | None]:
    if card == "aqi" and ctx.aqi is not None and ctx.aqi > 150:
        return 14.0, f"Air quality is {ctx.aqi_category.lower()} right now"
    if card == "uv_index" and ctx.current_uv is not None and ctx.current_uv >= 7:
        return 12.0, "UV index is high today"
    if card == "wind" and ctx.current_wind >= 30:
        return 10.0, "Wind speeds are elevated right now"
    if card == "rain_probability" and ctx.rain_likely_evening:
        return 10.0, "Rain is likely later today"
    if card == "temp_extremes" and (ctx.current_temp >= 38 or ctx.current_temp <= 5):
        return 12.0, "Temperature is at an extreme today"
    return 0.0, None


def _time_relevance_weight(card: str, ctx: ScoringContext) -> tuple[float, str | None]:
    is_morning = 5 <= ctx.local_hour < 11
    is_evening = 17 <= ctx.local_hour < 22
    if is_morning and card in ("uv_index", "commute_conditions", "temperature"):
        return 5.0, "It's morning - relevant for your commute or workout"
    if is_evening and card in ("forecast", "rain_probability"):
        return 5.0, "It's evening - showing what's coming up tomorrow"
    return 0.0, None


def _location_relevance_weight(card: str, ctx: ScoringContext) -> tuple[float, str | None]:
    marine_cards = {"wave_height", "marine_conditions", "tide"}
    if card in marine_cards:
        if not ctx.marine_available:
            return -50.0, None  # effectively hidden - no coastal data for this location
        return 5.0, "You're near a coastal location"
    return 0.0, None


def _season_relevance_weight(card: str, ctx: ScoringContext) -> tuple[float, str | None]:
    if ctx.month in _MONSOON_MONTHS and card in ("rainfall", "rain_probability"):
        return 6.0, "It's monsoon season"
    if ctx.month in _SUMMER_MONTHS and card in ("uv_index", "temperature"):
        return 4.0, "Summer heat makes this more relevant"
    if ctx.month in _WINTER_MONTHS and card == "temp_extremes":
        return 4.0, "Winter conditions make this more relevant"
    return 0.0, None


def _interaction_weight(card: str, ctx: ScoringContext) -> tuple[float, str | None]:
    weight = ctx.interaction_weights.get(card, 0.0)
    if weight > 0:
        return min(weight, 10.0), "You've checked this often recently"
    return 0.0, None


def score_card(card: str, ctx: ScoringContext) -> tuple[float, str]:
    persona = _persona_weight(card, ctx.interests)
    factors = [
        _weather_severity_weight(card, ctx),
        _time_relevance_weight(card, ctx),
        _location_relevance_weight(card, ctx),
        _season_relevance_weight(card, ctx),
        _interaction_weight(card, ctx),
    ]
    total = persona + sum(f[0] for f in factors)

    best_factor = max(factors, key=lambda f: f[0], default=(0.0, None))
    if best_factor[0] > 0 and best_factor[1]:
        reason = best_factor[1]
    elif ctx.interests:
        matching = [i for i in ctx.interests if card in INTEREST_CARD_PRIORITY.get(i, [])]
        reason = (
            f"Prioritized because you selected {INTEREST_LABELS.get(matching[0], matching[0])}"
            if matching
            else "Part of your default homepage view"
        )
    else:
        reason = "Part of your default homepage view"
    return total, reason


def compute_card_order(
    interests: list[str],
    weather: WeatherResponse | None = None,
    air_quality: AirQualityResponse | None = None,
    forecast: ForecastResponse | None = None,
    has_severe_alert: bool = False,
    marine_available: bool = False,
    interaction_weights: dict[str, float] | None = None,
) -> tuple[list[str], dict[str, str]]:
    """Returns (ordered_card_keys, reasons). Backward compatible: calling with only
    `interests` still works exactly like the V1 engine, just with richer scoring available
    when the extra context is provided."""
    now = now_ist()
    rain_likely_evening = False
    if forecast is not None and forecast.hourly:
        evening_points = [h for h in forecast.hourly if h.time[11:13].isdigit() and 17 <= int(h.time[11:13]) <= 21]
        rain_likely_evening = max((h.precipitation_probability or 0 for h in evening_points), default=0) >= 50

    ctx = ScoringContext(
        interests=interests,
        current_temp=weather.current.temperature if weather else 25.0,
        current_uv=weather.current.uv_index if weather else None,
        current_wind=weather.current.wind_speed if weather and weather.current.wind_speed is not None else 0.0,
        aqi=air_quality.us_aqi if air_quality else None,
        aqi_category=air_quality.category if air_quality else "Unknown",
        rain_likely_evening=rain_likely_evening,
        has_severe_alert=has_severe_alert,
        local_hour=now.hour,
        month=now.month,
        marine_available=marine_available,
        interaction_weights=interaction_weights or {},
    )

    all_cards: set[str] = set(DEFAULT_CARD_ORDER)
    for priority_list in INTEREST_CARD_PRIORITY.values():
        all_cards.update(priority_list)

    scored = {card: score_card(card, ctx) for card in all_cards}
    ordered = sorted(scored.keys(), key=lambda c: scored[c][0], reverse=True)
    reasons = {card: scored[card][1] for card in ordered}
    return ordered, reasons


def generate_insights(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
) -> list[PersonalizedInsight]:
    insights: list[PersonalizedInsight] = []
    current = weather.current
    hour = now_ist().hour
    interest_set = set(interests)
    outdoor_relevant = bool(interest_set & {"outdoor_fitness", "health", "events", "family", "elderly"}) or not interests

    if air_quality is not None and air_quality.us_aqi is not None and air_quality.us_aqi > 150 and outdoor_relevant:
        insights.append(
            PersonalizedInsight(
                message=f"Air quality is {air_quality.category.lower()} (AQI {air_quality.us_aqi}) — consider indoor exercise today.",
                icon="wind",
                priority=9,
                reason="Air quality crossed the unhealthy threshold for your selected interests",
            )
        )
    elif current.uv_index is not None and current.uv_index >= 7 and hour < 16 and outdoor_relevant:
        insights.append(
            PersonalizedInsight(
                message="High UV today — outdoor activity is safer before 10 AM or after 4 PM.",
                icon="sun",
                priority=8,
                reason="UV index is high and it's currently daytime",
            )
        )
    elif current.uv_index is not None and current.uv_index < 4 and "outdoor_fitness" in interest_set:
        insights.append(
            PersonalizedInsight(
                message="Good time for outdoor exercise — UV and conditions look favorable.",
                icon="activity",
                priority=5,
                reason="You selected Outdoor Fitness and UV is currently low",
            )
        )

    if forecast is not None and forecast.hourly:
        evening_points = [h for h in forecast.hourly if h.time[11:13].isdigit() and 17 <= int(h.time[11:13]) <= 21]
        max_evening_rain = max((h.precipitation_probability or 0 for h in evening_points), default=0)
        if max_evening_rain >= 50:
            insights.append(
                PersonalizedInsight(
                    message="Carry an umbrella after 6 PM — rain is likely this evening.",
                    icon="umbrella",
                    priority=7,
                    reason=f"{max_evening_rain:.0f}% rain chance this evening",
                )
            )

    if current.temperature >= 35 and (interest_set & {"outdoor_fitness", "agriculture", "events", "family", "elderly"} or not interests):
        insights.append(
            PersonalizedInsight(
                message=f"It's {current.temperature:.0f}\u00b0C — stay hydrated and avoid peak midday sun.",
                icon="thermometer",
                priority=6,
                reason="Current temperature is high",
            )
        )

    if "elderly" in interest_set and (current.temperature >= 38 or current.temperature <= 5):
        insights.append(
            PersonalizedInsight(
                message=f"Temperature extremes today ({current.temperature:.0f}\u00b0C) — check on elderly family members and limit their time outdoors.",
                icon="heart",
                priority=9,
                reason="You selected Elderly/Vulnerable and today has a temperature extreme",
            )
        )

    if "marine_beach" in interest_set and current.wind_speed is not None and current.wind_speed >= 30:
        insights.append(
            PersonalizedInsight(
                message=f"Winds at {current.wind_speed:.0f} km/h — check local advisories before heading out on the water.",
                icon="wind",
                priority=6,
                reason="You selected Fisherman/Marine and winds are elevated",
            )
        )

    if "agriculture" in interest_set and current.temperature <= 5:
        insights.append(
            PersonalizedInsight(
                message="Low temperatures tonight — consider frost protection for sensitive crops.",
                icon="snowflake",
                priority=7,
                reason="You selected Farmer/Agriculture and temperatures are near freezing",
            )
        )

    if not insights:
        insights.append(
            PersonalizedInsight(
                message=f"Conditions in {weather.location.name} look stable — a good day to plan ahead.",
                icon="check-circle",
                priority=1,
                reason="No unusual conditions detected right now",
            )
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
                reason="Based on today's temperature and UV curve",
            )
        )

    if "travel" in interests:
        note = "Pack a compact umbrella or raincoat." if rain_soon or current.condition_group in ("rain", "drizzle", "storm") else "Pack light — no rain expected right now."
        cards.append(RecommendationCard(interest="travel", title="Packing Suggestion", description=note, icon="briefcase", reason="Based on rain probability at your destination"))

    if "family" in interests:
        note = "Roads look clear for the school commute." if current.condition_group in ("clear", "cloudy") else f"Expect {current.condition.lower()} during commute hours — plan extra time."
        cards.append(RecommendationCard(interest="family", title="School Commute", description=note, icon="users", reason="Based on current road/visibility conditions"))

    if "agriculture" in interests:
        rain_next_24h = bool(forecast and forecast.daily and (forecast.daily[0].precipitation_probability_max or 0) >= 50)
        disease_risk = current.humidity is not None and current.humidity >= 80 and rain_next_24h
        if disease_risk:
            desc = f"High humidity ({current.humidity:.0f}%) with rain expected — monitor crops for fungal disease risk."
        elif rain_next_24h:
            desc = "Rain expected soon — consider postponing irrigation."
        elif current.humidity is not None:
            desc = f"Humidity at {current.humidity:.0f}%, {current.condition.lower()} — monitor soil moisture before irrigating."
        else:
            desc = f"{current.condition} — humidity unavailable; monitor soil moisture before irrigating."
        cards.append(
            RecommendationCard(
                interest="agriculture",
                title="Field Conditions",
                description=desc,
                icon="sprout",
                reason="Based on humidity and rain forecast (weather-derived, not an official agronomic advisory)",
                label="Weather-based recommendation",
            )
        )

    if "marine_beach" in interests:
        cards.append(
            RecommendationCard(
                interest="marine_beach",
                title="Beach & Marine Outlook",
                description=(
                    f"Wind at {current.wind_speed:.0f} km/h. Check the Marine card for wave and tide conditions."
                    if current.wind_speed is not None
                    else "Wind unavailable. Check the Marine card for wave and tide conditions."
                ),
                icon="waves",
                reason="Based on current wind conditions",
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
                reason="Based on current visibility",
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
                reason="Based on the 'feels like' comfort range",
            )
        )

    if "health" in interests:
        uv = current.uv_index or 0
        cards.append(
            RecommendationCard(
                interest="health",
                title="Health Advisory",
                description=(
                    f"UV index {uv:.0f}, humidity "
                    f"{f'{current.humidity:.0f}%' if current.humidity is not None else 'unavailable'}. "
                    f"{'Stay hydrated.' if current.temperature > 30 else 'Conditions are comfortable.'}"
                ),
                icon="heart",
                reason="Based on current UV and temperature",
            )
        )

    if "elderly" in interests:
        risky = current.temperature >= 35 or current.temperature <= 8
        cards.append(
            RecommendationCard(
                interest="elderly",
                title="Wellness Check",
                description=(
                    f"{current.temperature:.0f}\u00b0C today — consider limiting outdoor time for elderly family members and staying hydrated/warm."
                    if risky
                    else f"{current.temperature:.0f}\u00b0C, {current.condition.lower()} — comfortable conditions today."
                ),
                icon="heart",
                reason="Based on temperature extremes, which affect vulnerable groups most",
            )
        )

    return cards


def build_insights_response(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
    has_severe_alert: bool = False,
    marine_available: bool = False,
    interaction_weights: dict[str, float] | None = None,
) -> InsightsResponse:
    card_order, card_reasons = compute_card_order(
        interests,
        weather=weather,
        air_quality=air_quality,
        forecast=forecast,
        has_severe_alert=has_severe_alert,
        marine_available=marine_available,
        interaction_weights=interaction_weights,
    )
    return InsightsResponse(
        card_order=card_order,
        card_reasons=card_reasons,
        insights=generate_insights(weather, forecast, air_quality, interests),
        recommendations=generate_recommendations(weather, forecast, interests),
    )
