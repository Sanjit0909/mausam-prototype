from fastapi import APIRouter, Query

from ..models.weather import WeatherResponse
from ..services.open_meteo import get_current_weather

router = APIRouter(prefix="/api/weather", tags=["weather"])


@router.get("", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
) -> WeatherResponse:
    return await get_current_weather(lat, lon, name)
