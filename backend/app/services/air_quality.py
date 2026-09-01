"""Air quality adapter backed by Open-Meteo's free Air Quality API (no key required)."""
from ..core.cache import TTLCache, location_key
from ..core.http_client import UpstreamAPIError, get_http_client
from ..models.common import LocationInfo
from ..models.environment import AirQualityResponse

AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
CURRENT_VARS = "us_aqi,european_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide"

_cache = TTLCache(ttl_seconds=600)


def categorize_us_aqi(aqi: int | None) -> str:
    if aqi is None:
        return "Unknown"
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


async def get_air_quality(lat: float, lon: float, name: str | None = None) -> AirQualityResponse:
    key = f"aqi:{location_key(lat, lon)}"

    async def _fetch() -> dict:
        client = get_http_client()
        try:
            resp = await client.get(
                AIR_QUALITY_URL,
                params={"latitude": lat, "longitude": lon, "current": CURRENT_VARS, "timezone": "auto"},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            stale = _cache.get_stale(key)
            if stale is not None:
                return stale
            raise UpstreamAPIError("open-meteo-air-quality", "Air quality data is temporarily unavailable") from exc

    raw = await _cache.get_or_set(key, _fetch)
    current = raw.get("current", {})
    us_aqi = current.get("us_aqi")

    return AirQualityResponse(
        location=LocationInfo(
            name=name or "Selected location",
            lat=raw.get("latitude", lat),
            lon=raw.get("longitude", lon),
            timezone=raw.get("timezone"),
        ),
        us_aqi=us_aqi,
        european_aqi=current.get("european_aqi"),
        category=categorize_us_aqi(us_aqi),
        pm2_5=current.get("pm2_5"),
        pm10=current.get("pm10"),
        ozone=current.get("ozone"),
        nitrogen_dioxide=current.get("nitrogen_dioxide"),
        sulphur_dioxide=current.get("sulphur_dioxide"),
        carbon_monoxide=current.get("carbon_monoxide"),
    )
