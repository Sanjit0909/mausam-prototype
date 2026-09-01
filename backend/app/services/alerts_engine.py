"""Rule-based derived weather alerts computed from real, live weather/AQI thresholds.

No official India-wide severe weather alert API is publicly available without special
access (IMD has no public JSON API), so alerts for non-US locations are generated here
from real thresholds and always labeled `source="derived"` - never presented as an
official government alert.
"""
from datetime import datetime, timezone

from ..models.alerts import WeatherAlert
from ..models.environment import AirQualityResponse
from ..models.weather import ForecastResponse, WeatherResponse


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_derived_alerts(
    weather: WeatherResponse,
    forecast: ForecastResponse | None = None,
    air_quality: AirQualityResponse | None = None,
) -> list[WeatherAlert]:
    alerts: list[WeatherAlert] = []
    current = weather.current
    location_name = weather.location.name

    if current.temperature >= 40:
        alerts.append(
            WeatherAlert(
                id="heat-extreme",
                title="Extreme Heat Advisory",
                description=(
                    f"Temperature has reached {current.temperature:.0f}\u00b0C in {location_name}. "
                    "Avoid prolonged sun exposure and stay hydrated."
                ),
                severity="severe",
                alert_type="heat",
                source="derived",
                issued_at=_now_iso(),
            )
        )
    elif current.temperature >= 35:
        alerts.append(
            WeatherAlert(
                id="heat-high",
                title="Heat Advisory",
                description=(
                    f"It's {current.temperature:.0f}\u00b0C and feels like {current.feels_like:.0f}\u00b0C. "
                    "Limit outdoor activity during midday hours."
                ),
                severity="moderate",
                alert_type="heat",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if current.temperature <= 4:
        alerts.append(
            WeatherAlert(
                id="cold-advisory",
                title="Cold Weather Advisory",
                description=f"Temperature has dropped to {current.temperature:.0f}\u00b0C in {location_name}. Dress warmly.",
                severity="moderate",
                alert_type="cold",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if current.wind_speed >= 50:
        alerts.append(
            WeatherAlert(
                id="wind-high",
                title="High Wind Warning",
                description=f"Wind speeds of {current.wind_speed:.0f} km/h reported in {location_name}. Secure loose outdoor items.",
                severity="severe",
                alert_type="wind",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if current.condition_group == "storm":
        alerts.append(
            WeatherAlert(
                id="storm-active",
                title="Thunderstorm Alert",
                description=f"Thunderstorm activity detected in {location_name}. Avoid open areas and unnecessary travel.",
                severity="severe",
                alert_type="storm",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if current.condition_group == "fog":
        alerts.append(
            WeatherAlert(
                id="fog-visibility",
                title="Fog Advisory",
                description=f"Reduced visibility due to fog in {location_name}. Drive carefully and use fog lights.",
                severity="minor",
                alert_type="fog",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if current.uv_index is not None and current.uv_index >= 8:
        alerts.append(
            WeatherAlert(
                id="uv-high",
                title="High UV Index",
                description=f"UV index is {current.uv_index:.0f} (very high) in {location_name}. Use sunscreen and seek shade.",
                severity="moderate",
                alert_type="uv",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if air_quality is not None and air_quality.us_aqi is not None and air_quality.us_aqi > 150:
        severity = "severe" if air_quality.us_aqi > 200 else "moderate"
        alerts.append(
            WeatherAlert(
                id="aqi-poor",
                title=f"Air Quality Alert: {air_quality.category}",
                description=(
                    f"AQI is {air_quality.us_aqi} ({air_quality.category}) in {location_name}. "
                    "Consider limiting outdoor exertion, especially for sensitive groups."
                ),
                severity=severity,
                alert_type="aqi",
                source="derived",
                issued_at=_now_iso(),
            )
        )

    if forecast is not None and forecast.daily:
        today = forecast.daily[0]
        if today.precipitation_probability_max is not None and today.precipitation_probability_max >= 70:
            alerts.append(
                WeatherAlert(
                    id="rain-high-probability",
                    title="Heavy Rain Likely",
                    description=(
                        f"{today.precipitation_probability_max:.0f}% chance of rain today in {location_name}. "
                        "Carry an umbrella and allow extra travel time."
                    ),
                    severity="minor",
                    alert_type="rain",
                    source="derived",
                    issued_at=_now_iso(),
                )
            )

    return alerts
