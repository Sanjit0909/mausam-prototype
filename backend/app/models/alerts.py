from pydantic import BaseModel


class WeatherAlert(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # "minor" | "moderate" | "severe" | "extreme"
    alert_type: str  # "heat" | "cold" | "rain" | "wind" | "aqi" | "uv" | "storm" | "fog"
    source: str  # "official" (e.g. NWS) | "derived" (rule-based, from live thresholds)
    issued_at: str


class AlertsResponse(BaseModel):
    location_name: str
    alerts: list[WeatherAlert]
