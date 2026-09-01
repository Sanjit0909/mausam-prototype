from fastapi import APIRouter, Query

from ..models.weather import ForecastResponse
from ..services.weather_provider import get_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("", response_model=ForecastResponse)
async def get_forecast_route(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    days: int = Query(7, ge=1, le=16),
    name: str | None = Query(None),
) -> ForecastResponse:
    return await get_forecast(lat, lon, days=days, name=name)
