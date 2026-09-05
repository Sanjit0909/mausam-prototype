import asyncio

from fastapi import APIRouter, Query

from ..models.alerts import AlertsResponse, has_severe_alert
from ..models.personalization import HomeResponse
from ..services.air_quality import get_air_quality
from ..services.alerts_engine import generate_derived_alerts
from ..services.alerts_provider import get_official_alerts
from ..services.astronomy import get_astronomy
from ..services.marine_provider import get_marine
from ..services.recommendation_engine import build_insights_response
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/home", tags=["home"])


def _parse_interaction_weights(raw: str) -> dict[str, float]:
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


@router.get("", response_model=HomeResponse)
async def get_home(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
    interests: str = Query(""),
    interaction: str = Query(""),
) -> HomeResponse:
    interest_list = [i.strip() for i in interests.split(",") if i.strip()]
    interaction_weights = _parse_interaction_weights(interaction)

    weather_result, forecast_result, air_quality_result, official_result, marine_result, astronomy_result = await asyncio.gather(
        get_current_weather(lat, lon, name),
        get_forecast(lat, lon, days=7, name=name),
        get_air_quality(lat, lon, name),
        get_official_alerts(lat, lon),
        get_marine(lat, lon, name),
        get_astronomy(lat, lon, name),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result
    official_alerts = [] if isinstance(official_result, BaseException) else official_result
    marine = None if isinstance(marine_result, BaseException) else marine_result
    astronomy = None if isinstance(astronomy_result, BaseException) else astronomy_result

    derived = generate_derived_alerts(weather_result, forecast, air_quality)
    all_alerts = official_alerts + derived
    has_severe = has_severe_alert(all_alerts)
    marine_available = bool(marine and marine.available)

    insights = build_insights_response(
        weather_result,
        forecast,
        air_quality,
        interest_list,
        has_severe_alert=has_severe,
        marine_available=marine_available,
        interaction_weights=interaction_weights,
    )
    alerts = AlertsResponse(
        location_name=weather_result.location.name,
        alerts=all_alerts,
        has_severe=has_severe,
    )

    return HomeResponse(
        weather=weather_result,
        forecast=forecast,
        air_quality=air_quality,
        alerts=alerts,
        insights=insights,
        astronomy=astronomy,
        marine=marine,
    )
