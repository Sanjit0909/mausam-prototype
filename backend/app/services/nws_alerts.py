"""Bonus: real official severe weather alerts from the US National Weather Service (no key).

US-only by nature of the data source. For all other locations (including India), the app
relies on `alerts_engine.generate_derived_alerts` instead.
"""
from ..core.http_client import get_http_client
from ..models.alerts import WeatherAlert

NWS_ALERTS_URL = "https://api.weather.gov/alerts/active"

_SEVERITY_MAP = {
    "Extreme": "extreme",
    "Severe": "severe",
    "Moderate": "moderate",
    "Minor": "minor",
    "Unknown": "minor",
}


def _in_us_bounds(lat: float, lon: float) -> bool:
    """Rough continental US + Alaska bounding check, used only to decide whether it's
    worth attempting the NWS lookup at all before making a network call."""
    return 24.0 <= lat <= 72.0 and -170.0 <= lon <= -66.0


async def fetch_nws_alerts(lat: float, lon: float) -> list[WeatherAlert]:
    if not _in_us_bounds(lat, lon):
        return []

    client = get_http_client()
    try:
        resp = await client.get(
            NWS_ALERTS_URL,
            params={"point": f"{lat},{lon}"},
            headers={"User-Agent": "MausamWeatherApp-SIH-Prototype (contact: demo@example.com)"},
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception:  # noqa: BLE001 - bonus feature, never fatal to the request
        return []

    alerts: list[WeatherAlert] = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        alerts.append(
            WeatherAlert(
                id=str(props.get("id", feature.get("id", "nws-alert"))),
                title=props.get("headline") or props.get("event", "Weather Alert"),
                description=(props.get("description") or "")[:500],
                severity=_SEVERITY_MAP.get(props.get("severity", "Unknown"), "minor"),
                alert_type="storm",
                source="official",
                issued_at=props.get("sent", ""),
            )
        )
    return alerts
