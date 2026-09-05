"""Location search via Open-Meteo's free geocoding API (no key required).

Also provides best-effort Indian district/state name resolution for matching against
IMD's official district catalog (never invents IMD Obj_id values).
"""
from ..core.cache import TTLCache
from ..core.http_client import UpstreamAPIError, get_http_client, get_with_backoff
from ..models.common import LocationSearchResult

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
# Open-Meteo's geocoding API is forward-search only (no reverse endpoint).
# BigDataCloud's client reverse-geocode API is free, keyless, and built for this exact use case.
REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client"

_cache = TTLCache(ttl_seconds=3600)


async def search_locations(query: str, count: int = 8) -> list[LocationSearchResult]:
    key = f"search:{query.lower()}:{count}"

    async def _fetch() -> list[LocationSearchResult]:
        try:
            resp = await get_with_backoff(
                GEOCODING_URL,
                params={"name": query, "count": count, "language": "en", "format": "json"},
            )
        except Exception as exc:  # noqa: BLE001 - normalize all upstream failures
            raise UpstreamAPIError("geocoding", "Location search is temporarily unavailable") from exc

        data = resp.json()
        results = []
        for item in data.get("results", []) or []:
            results.append(
                LocationSearchResult(
                    name=item.get("name", "Unknown"),
                    country=item.get("country"),
                    admin1=item.get("admin1"),
                    lat=item["latitude"],
                    lon=item["longitude"],
                    timezone=item.get("timezone"),
                    population=item.get("population"),
                )
            )
        return results

    return await _cache.get_or_set(key, _fetch)


def _district_from_locality_info(data: dict) -> str | None:
    """Extract an Indian district-like name from BigDataCloud localityInfo when present."""
    info = data.get("localityInfo") or {}
    admins = info.get("administrative") or []
    if not isinstance(admins, list):
        return None

    for entry in admins:
        if not isinstance(entry, dict):
            continue
        name = (entry.get("name") or "").strip()
        desc = f"{entry.get('description') or ''} {entry.get('isoName') or ''}".lower()
        if not name:
            continue
        if "district" in desc or name.lower().endswith(" district"):
            return name.replace(" District", "").replace(" district", "").strip()

    state = (data.get("principalSubdivision") or "").strip()
    for level in (5, 6, 4):
        for entry in admins:
            if not isinstance(entry, dict):
                continue
            if entry.get("adminLevel") == level:
                name = (entry.get("name") or "").strip()
                if not name or name == state:
                    continue
                if name.lower() in {"india", "republic of india"}:
                    continue
                return name
    return None


async def reverse_geocode(lat: float, lon: float) -> LocationSearchResult | None:
    """Best-effort reverse lookup for a friendly place name from raw coordinates
    (used when the user shares browser geolocation instead of searching by name).
    """
    key = f"reverse:{round(lat, 3)}:{round(lon, 3)}"

    async def _fetch() -> LocationSearchResult | None:
        client = get_http_client()
        try:
            resp = await client.get(
                REVERSE_URL,
                params={"latitude": lat, "longitude": lon, "localityLanguage": "en"},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:  # noqa: BLE001 - reverse geocoding is best-effort, never fatal
            return None

        city = data.get("city") or data.get("locality")
        if not city:
            return None
        return LocationSearchResult(
            name=city,
            country=data.get("countryName"),
            admin1=data.get("principalSubdivision"),
            lat=lat,
            lon=lon,
            timezone=None,
            population=None,
        )

    return await _cache.get_or_set(key, _fetch)


async def resolve_india_district(lat: float, lon: float) -> dict[str, str | None]:
    """Resolve best-effort Indian district/state names for IMD catalog matching.

    Returns keys: district, state, city, country. Values may be None.
    Does NOT return or invent IMD Obj_id.
    """
    key = f"india-district:{round(lat, 3)}:{round(lon, 3)}"

    async def _fetch() -> dict[str, str | None]:
        client = get_http_client()
        empty: dict[str, str | None] = {"district": None, "state": None, "city": None, "country": None}
        try:
            resp = await client.get(
                REVERSE_URL,
                params={"latitude": lat, "longitude": lon, "localityLanguage": "en"},
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:  # noqa: BLE001
            return empty

        country = (data.get("countryName") or "").strip() or None
        state = (data.get("principalSubdivision") or "").strip() or None
        city = (data.get("city") or data.get("locality") or "").strip() or None
        district = _district_from_locality_info(data)
        if not district:
            loc = (data.get("locality") or "").strip()
            if loc and loc != city and "district" in loc.lower():
                district = loc.replace(" District", "").replace(" district", "").strip()
        return {"district": district, "state": state, "city": city, "country": country}

    return await _cache.get_or_set(key, _fetch)
