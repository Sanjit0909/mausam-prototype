"""Real historical weather via Open-Meteo's free Archive API (no key required, no fabricated data)."""
from datetime import date, timedelta

from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_http_client
from ..models.common import LocationInfo
from ..models.environment import HistoricalPoint, HistoricalResponse

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

_cache = TTLCache(ttl_seconds=6 * 3600)


async def get_historical(lat: float, lon: float, days: int = 30, name: str | None = None) -> HistoricalResponse:
    end = date.today() - timedelta(days=2)  # archive ingestion has a short delay
    start = end - timedelta(days=days)
    key = f"hist:{location_key(lat, lon)}:{start}:{end}"

    async def _fetch() -> dict:
        client = get_http_client()
        try:
            resp = await client.get(
                ARCHIVE_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "start_date": start.isoformat(),
                    "end_date": end.isoformat(),
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum",
                    "timezone": "auto",
                },
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            raise UpstreamAPIError("open-meteo-archive", "Historical data is temporarily unavailable") from exc

    raw = await _cache.get_or_set(key, _fetch)
    daily = raw.get("daily", {})
    dates = daily.get("time", [])
    points = [
        HistoricalPoint(
            date=d,
            temp_max=daily.get("temperature_2m_max", [None] * len(dates))[i],
            temp_min=daily.get("temperature_2m_min", [None] * len(dates))[i],
            precipitation=daily.get("precipitation_sum", [None] * len(dates))[i],
        )
        for i, d in enumerate(dates)
    ]

    return HistoricalResponse(
        location=LocationInfo(
            name=name or "Selected location",
            lat=raw.get("latitude", lat),
            lon=raw.get("longitude", lon),
            timezone=raw.get("timezone"),
        ),
        data=points,
    )
