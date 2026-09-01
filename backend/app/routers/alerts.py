import asyncio

from fastapi import APIRouter, Query

from ..models.alerts import AlertsResponse
from ..services.air_quality import get_air_quality
from ..services.alerts_engine import generate_derived_alerts
from ..services.nws_alerts import fetch_nws_alerts
from ..services.open_meteo import get_current_weather, get_forecast

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
        fetch_nws_alerts(lat, lon),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result
    official_alerts = [] if isinstance(official, BaseException) else official

    derived = generate_derived_alerts(weather_result, forecast, air_quality)

    return AlertsResponse(location_name=weather_result.location.name, alerts=official_alerts + derived)
