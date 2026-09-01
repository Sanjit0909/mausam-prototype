from fastapi import APIRouter, Query

from ..models.environment import HistoricalResponse
from ..services.historical import get_historical

router = APIRouter(prefix="/api/historical", tags=["historical"])


@router.get("", response_model=HistoricalResponse)
async def get_historical_route(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    days: int = Query(30, ge=7, le=365),
    name: str | None = Query(None),
) -> HistoricalResponse:
    return await get_historical(lat, lon, days=days, name=name)
