import asyncio

from fastapi import APIRouter, Query

from ..models.alerts import has_severe_alert
from ..models.personalization import InsightsResponse
from ..services.air_quality import get_air_quality
from ..services.alerts_engine import generate_derived_alerts
from ..services.alerts_provider import get_official_alerts
from ..services.marine_provider import get_marine
from ..services.recommendation_engine import build_insights_response
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/insights", tags=["insights"])


def _parse_interaction_weights(raw: str) -> dict[str, float]:
    """Parses `card:count,card:count` from the lightweight frontend interaction tracker
    into a scoring-ready weight dict. Never raises on malformed input - worst case, the
    interaction factor just contributes nothing this request."""
    weights: dict[str, float] = {}
    for part in raw.split(","):
        if ":" not in part:
            continue
        card, _, count = part.partition(":")
        try:
            weights[card.strip()] = float(count)
        except ValueError:
            continue
    return weights


@router.get("", response_model=InsightsResponse)
async def get_insights(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
    interests: str = Query("", description="Comma-separated interest keys"),
    interaction: str = Query("", description="Lightweight interaction signal: card:count,card:count"),
) -> InsightsResponse:
    interest_list = [i.strip() for i in interests.split(",") if i.strip()]
    interaction_weights = _parse_interaction_weights(interaction)

    weather_result, forecast_result, air_quality_result, official_alerts_result, marine_result = await asyncio.gather(
        get_current_weather(lat, lon, name),
        get_forecast(lat, lon, days=2, name=name),
        get_air_quality(lat, lon, name),
        get_official_alerts(lat, lon),
        get_marine(lat, lon, name),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result
    official_alerts = [] if isinstance(official_alerts_result, BaseException) else official_alerts_result
    marine = None if isinstance(marine_result, BaseException) else marine_result

    derived = generate_derived_alerts(weather_result, forecast, air_quality)
    has_severe = has_severe_alert(official_alerts + derived)
    marine_available = bool(marine and marine.available)

    return build_insights_response(
        weather_result,
        forecast,
        air_quality,
        interest_list,
        has_severe_alert=has_severe,
        marine_available=marine_available,
        interaction_weights=interaction_weights,
    )
