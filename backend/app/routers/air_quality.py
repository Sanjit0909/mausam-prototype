from fastapi import APIRouter, Query

from ..models.environment import AirQualityResponse
from ..services.air_quality import get_air_quality

router = APIRouter(prefix="/api/air-quality", tags=["air-quality"])


@router.get("", response_model=AirQualityResponse)
async def get_air_quality_route(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
) -> AirQualityResponse:
    return await get_air_quality(lat, lon, name)
