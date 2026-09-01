import asyncio

from fastapi import APIRouter, Query

from ..models.personalization import InsightsResponse
from ..services.air_quality import get_air_quality
from ..services.open_meteo import get_current_weather, get_forecast
from ..services.recommendation_engine import build_insights_response

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("", response_model=InsightsResponse)
async def get_insights(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
    interests: str = Query("", description="Comma-separated interest keys"),
) -> InsightsResponse:
    interest_list = [i.strip() for i in interests.split(",") if i.strip()]

    weather_result, forecast_result, air_quality_result = await asyncio.gather(
        get_current_weather(lat, lon, name),
        get_forecast(lat, lon, days=2, name=name),
        get_air_quality(lat, lon, name),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result

    return build_insights_response(weather_result, forecast, air_quality, interest_list)
