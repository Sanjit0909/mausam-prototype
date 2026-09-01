from fastapi import APIRouter, Query

from ..models.environment import MarineResponse
from ..services.marine import get_marine

router = APIRouter(prefix="/api/marine", tags=["marine"])


@router.get("", response_model=MarineResponse)
async def get_marine_route(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
) -> MarineResponse:
    return await get_marine(lat, lon, name)
