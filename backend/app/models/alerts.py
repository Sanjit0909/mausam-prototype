from pydantic import BaseModel


class WeatherAlert(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # "minor" | "moderate" | "severe" | "extreme"
    alert_type: str  # "heat" | "cold" | "rain" | "wind" | "aqi" | "uv" | "storm" | "fog"
    source: str  # "IMD" | "NWS" | "derived" (rule-based, from live thresholds)
    provider_label: str = "MAUSAM Advisory"  # human-readable source for SourceBadge, e.g. "IMD - Official Warning"
    area: str | None = None  # affected area/district, when known
    issued_at: str
    updated_at: str | None = None


class AlertsResponse(BaseModel):
    location_name: str
    alerts: list[WeatherAlert]
    has_severe: bool = False  # safety-override flag: true if any alert is severe/extreme
    # IMD district-warning provenance (optional; ignored by older clients).
    # Distinguishes API failure / unmapped district from "IMD says no active warning".
    imd_status: str | None = None  # not_configured | unavailable | unmapped_district | ok_no_active | ok
    imd_district: str | None = None
    imd_district_id: str | None = None
    imd_state: str | None = None


_SEVERE_LEVELS = {"severe", "extreme"}


def has_severe_alert(alerts: list[WeatherAlert]) -> bool:
    """Safety-override invariant (spec section 11): true whenever ANY alert - official or
    derived - is severe/extreme, regardless of persona/score. Extracted as a standalone,
    directly-testable function so this guarantee can never silently regress."""
    return any(a.severity in _SEVERE_LEVELS for a in alerts)
