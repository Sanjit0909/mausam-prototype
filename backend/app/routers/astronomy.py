from fastapi import APIRouter, Query

from ..models.environment import AstronomyResponse
from ..services.astronomy import get_astronomy

router = APIRouter(prefix="/api/astronomy", tags=["astronomy"])


@router.get("", response_model=AstronomyResponse)
async def get_astronomy_route(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
) -> AstronomyResponse:
    return await get_astronomy(lat, lon, name)
