import asyncio

from fastapi import APIRouter, Query

from ..models.alerts import AlertsResponse, has_severe_alert
from ..services.air_quality import get_air_quality
from ..services.alerts_engine import generate_derived_alerts
from ..services.alerts_provider import get_official_alerts
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertsResponse)
async def get_alerts(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
) -> AlertsResponse:
    # Run all independent external calls concurrently rather than one-by-one.
    weather_result, forecast_result, air_quality_result, official = await asyncio.gather(
        get_current_weather(lat, lon, name),
        get_forecast(lat, lon, days=1, name=name),
        get_air_quality(lat, lon, name),
        get_official_alerts(lat, lon),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result
    official_alerts = [] if isinstance(official, BaseException) else official

    derived = generate_derived_alerts(weather_result, forecast, air_quality)

    # Safety override (spec section 11): official warnings always precede derived advisories,
    # and any severe/extreme alert sets has_severe so the frontend can never let
    # personalization bury it.
    all_alerts = official_alerts + derived

    return AlertsResponse(location_name=weather_result.location.name, alerts=all_alerts, has_severe=has_severe_alert(all_alerts))
