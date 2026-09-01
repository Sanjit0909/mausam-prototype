from fastapi import APIRouter, Query

from ..models.common import LocationSearchResult
from ..services.geocoding import reverse_geocode, search_locations

router = APIRouter(prefix="/api/location", tags=["location"])


@router.get("/search", response_model=list[LocationSearchResult])
async def search(q: str = Query(..., min_length=1), count: int = Query(8, ge=1, le=20)) -> list[LocationSearchResult]:
    return await search_locations(q, count)


@router.get("/reverse", response_model=LocationSearchResult | None)
async def reverse(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    return await reverse_geocode(lat, lon)
