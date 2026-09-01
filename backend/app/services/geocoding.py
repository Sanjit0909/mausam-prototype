"""Location search via Open-Meteo's free geocoding API (no key required)."""
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
