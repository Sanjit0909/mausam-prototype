"""Deterministic persona homepage engine — Farmer / Runner / Traveller (and stubs).

Produces section order + expandable cards that differ by persona for the same weather.
No ML. Crop/stage must change farmer content when provided.
"""
from __future__ import annotations

from datetime import datetime, timezone

from ..models.environment import AirQualityResponse
from ..models.persona import (
    AgrometAdvisoryStatus,
    FarmerProfile,
    PersonaCard,
    PersonaHomePayload,
    PersonaId,
    PersonaProfile,
)
from ..models.weather import ForecastResponse, WeatherResponse
from .agromet import fetch_official_agromet_advisory

# Interest key → primary persona
INTEREST_TO_PERSONA: dict[str, PersonaId] = {
    "agriculture": "farmer",
    "outdoor_fitness": "runner",
    "travel": "traveller",
    "marine_beach": "marine",
    "family": "family",
    "commuting": "family",
    "events": "family",
    "health": "health_vulnerable",
    "elderly": "health_vulnerable",
}

# Canonical homepage section IDs (frontend PERSONA_CONFIG must match).
PERSONA_SECTION_ORDER: dict[PersonaId, list[str]] = {
    "farmer": [
        "alerts",
        "hero",
        "crop_stage",
        "agromet_advisory",
        "irrigation",
        "soil_moisture",
        "crop_risk",
        "farm_forecast",
        "metrics",
        "insights",
        "recommendations",
        "charts",
        "daily",
        "hourly",
        "astronomy",
    ],
    "runner": [
        "alerts",
        "hero",
        "best_run_time",
        "heat_humidity",
        "aqi",
        "uv",
        "rain",
        "wind",
        "hydration",
        "hourly_run",
        "metrics",
        "insights",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "astronomy",
    ],
    "traveller": [
        "alerts",
        "hero",
        "travel_risk",
        "rain",
        "visibility",
        "wind",
        "temperature",
        "hourly_travel",
        "packing",
        "metrics",
        "insights",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "astronomy",
    ],
    "marine": [
        "alerts",
        "hero",
        "metrics",
        "insights",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "marine",
        "astronomy",
    ],
    "family": [
        "alerts",
        "hero",
        "insights",
        "metrics",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "astronomy",
    ],
    "health_vulnerable": [
        "alerts",
        "hero",
        "aqi",
        "heat_humidity",
        "uv",
        "insights",
        "metrics",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "astronomy",
    ],
    "disaster": [
        "alerts",
        "hero",
        "insights",
        "metrics",
        "recommendations",
        "charts",
        "hourly",
        "daily",
        "astronomy",
    ],
}

PERSONA_METRIC_PRIORITY: dict[PersonaId, list[str]] = {
    "farmer": ["rain_probability", "humidity", "wind", "visibility", "pressure", "uv_index", "aqi"],
    "runner": ["aqi", "uv_index", "humidity", "rain_probability", "wind", "visibility", "pressure"],
    "traveller": ["visibility", "rain_probability", "wind", "humidity", "aqi", "uv_index", "pressure"],
    "marine": ["wind", "visibility", "rain_probability", "humidity", "pressure", "uv_index", "aqi"],
    "family": ["rain_probability", "aqi", "uv_index", "visibility", "wind", "humidity", "pressure"],
    "health_vulnerable": ["aqi", "uv_index", "humidity", "rain_probability", "wind", "visibility", "pressure"],
    "disaster": ["wind", "rain_probability", "visibility", "humidity", "pressure", "aqi", "uv_index"],
}

_CROP_LABELS = {
    "wheat": "Wheat",
    "rice": "Rice",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
    "maize": "Maize",
    "pulses": "Pulses",
    "other": "Crop",
}

_STAGE_LABELS = {
    "sowing": "Sowing",
    "vegetative": "Vegetative",
    "flowering": "Flowering",
    "fruiting": "Fruiting / Grain filling",
    "harvest": "Harvest",
}

_HEAT_SENSITIVE_STAGES = {"flowering", "fruiting", "harvest"}
_WATER_SENSITIVE_STAGES = {"sowing", "vegetative", "flowering"}
_WIND_SENSITIVE_CROPS = {"rice", "wheat", "maize"}


def resolve_persona(interests: list[str], profile: PersonaProfile | None = None) -> PersonaId:
    if profile and profile.primary_persona:
        return profile.primary_persona
    for interest in interests:
        mapped = INTEREST_TO_PERSONA.get(interest)
        if mapped:
            return mapped
    return "family"


def _iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _rain_next_hours(forecast: ForecastResponse | None, hours: int = 24) -> float:
    if not forecast or not forecast.hourly:
        return 0.0
    return max((h.precipitation_probability or 0) for h in forecast.hourly[:hours])


def _rain_today(forecast: ForecastResponse | None) -> float:
    if forecast and forecast.daily:
        return float(forecast.daily[0].precipitation_probability_max or 0)
    return _rain_next_hours(forecast, 24)


def _estimate_soil_moisture(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
) -> tuple[str, str, dict]:
    """Transparent weather-based estimate — never labelled as IMD soil moisture."""
    rain = _rain_today(forecast)
    precip = weather.current.precipitation or 0
    humidity = weather.current.humidity
    if rain >= 70 or precip >= 5:
        level = "Adequate to high"
        rec = "Field moisture likely sufficient — avoid unnecessary irrigation."
    elif rain >= 40 or humidity >= 75:
        level = "Moderate"
        rec = "Monitor field moisture; irrigate only if crop stage requires it."
    elif rain <= 15 and humidity < 45:
        level = "Likely dry"
        rec = "Consider irrigation if crop stage is water-sensitive."
    else:
        level = "Fair"
        rec = "Check field conditions before irrigating."
    data = {
        "rain_probability_today_pct": round(rain),
        "recent_precipitation_mm": precip,
        "humidity_pct": round(humidity),
        "method": "Rule-based estimate from precipitation probability, recent rain, and humidity",
    }
    return level, rec, data


def _irrigation_card(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
) -> PersonaCard:
    rain = _rain_today(forecast)
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.replace("_", " ").title())
    water_sensitive = farmer.crop_stage in _WATER_SENSITIVE_STAGES

    if rain >= 70:
        summary = f"Rain likely ({rain:.0f}%) — irrigation may be deferred"
        recommendation = (
            f"For {crop} at {stage}: postpone irrigation and ensure field drainage if heavy rain develops."
            if water_sensitive
            else f"For {crop} at {stage}: defer irrigation; watch for waterlogging."
        )
        severity = "advisory"
    elif rain >= 40:
        summary = f"Some rain possible ({rain:.0f}%) — irrigate selectively"
        recommendation = (
            f"{crop} ({stage}): irrigate only if soil feels dry; rain may cover part of the need."
        )
        severity = "watch"
    elif rain <= 20 and water_sensitive:
        summary = f"Little rain expected ({rain:.0f}%) — irrigation may be needed"
        recommendation = (
            f"{crop} at {stage} is water-sensitive. Plan irrigation if fields are drying."
        )
        severity = "advisory"
    else:
        summary = f"Rain chance {rain:.0f}% — follow normal irrigation schedule"
        recommendation = f"{crop} ({stage}): maintain your usual irrigation plan and re-check after any showers."
        severity = "info"

    return PersonaCard(
        id="irrigation",
        title="Rainfall & Irrigation Decision",
        summary=summary,
        detail=(
            f"Derived from today's rain probability ({rain:.0f}%), current precipitation "
            f"({weather.current.precipitation:.1f} mm), and your crop profile."
        ),
        recommendation=recommendation,
        supporting_data={
            "rain_probability_pct": round(rain),
            "precipitation_mm": weather.current.precipitation,
            "crop": farmer.crop,
            "crop_stage": farmer.crop_stage,
            "irrigation_type": farmer.irrigation_type,
        },
        provenance="derived",
        source_label="MAUSAM derived (not IMD advisory)",
        updated_at=_iso_now(),
        reason=(
            f"Shown because your profile is Farmer, your crop is {crop} at {stage} stage, "
            "and rainfall is relevant to irrigation planning."
        ),
        label="Derived farm recommendation",
        severity=severity,
        accent="emerald",
    )


def _soil_moisture_card(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
) -> PersonaCard:
    level, rec, data = _estimate_soil_moisture(weather, forecast)
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.title())
    return PersonaCard(
        id="soil_moisture",
        title="Soil Moisture Status — Estimated",
        summary=f"{level} (weather-based estimate)",
        detail=(
            "No official IMD soil-moisture observation is available through the APIs "
            "configured for this prototype. This estimate uses precipitation probability, "
            "recent rainfall, and humidity only."
        ),
        recommendation=f"{crop} / {stage}: {rec}",
        supporting_data={**data, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
        provenance="estimated",
        source_label="MAUSAM estimate (not IMD observation)",
        updated_at=_iso_now(),
        reason=(
            f"Shown because your profile is Farmer ({crop}, {stage}) and soil moisture "
            "helps irrigation decisions when official soil probes are unavailable."
        ),
        label="Estimated — not an official observation",
        severity="info",
        accent="amber",
    )


def _crop_risk_cards(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
) -> list[PersonaCard]:
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.title())
    risks: list[PersonaCard] = []
    c = weather.current
    rain = _rain_today(forecast)

    if rain >= 70:
        risks.append(
            PersonaCard(
                id="crop_risk_rain",
                title="Crop Stress: Heavy Rain Risk",
                summary=f"High rain chance ({rain:.0f}%) may stress {crop} at {stage}",
                detail="Derived risk from forecast precipitation probability.",
                recommendation=(
                    "Ensure drainage channels are clear. Delay fertilizer if heavy rain is expected."
                    if farmer.crop_stage in {"vegetative", "flowering", "fruiting"}
                    else "Protect harvested produce and delay field operations if rain is heavy."
                ),
                supporting_data={"rain_probability_pct": round(rain), "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label="MAUSAM derived",
                updated_at=_iso_now(),
                reason=f"Shown because you farm {crop} at {stage} and rainfall risk is elevated.",
                label="Derived crop risk",
                severity="warning" if rain >= 85 else "advisory",
            )
        )
    if c.temperature >= 38 and farmer.crop_stage in _HEAT_SENSITIVE_STAGES:
        risks.append(
            PersonaCard(
                id="crop_risk_heat",
                title="Crop Stress: Heat",
                summary=f"{c.temperature:.0f}°C — heat stress risk for {crop} ({stage})",
                detail="Flowering and grain-filling stages are especially heat-sensitive.",
                recommendation="Irrigate in early morning/evening if needed; avoid midday spraying.",
                supporting_data={"temperature_c": c.temperature, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label="MAUSAM derived",
                updated_at=_iso_now(),
                reason=f"Shown because {crop} at {stage} is heat-sensitive and temperature is high.",
                label="Derived crop risk",
                severity="advisory",
            )
        )
    if c.humidity >= 80 and rain >= 40:
        disease_note = {
            "rice": "Watch for blast / sheath blight pressure in humid wet spells.",
            "wheat": "Watch for rust / fungal pressure in humid conditions.",
            "cotton": "Watch for boll rot / fungal issues in humid wet weather.",
        }.get(farmer.crop, "Monitor for fungal disease pressure in humid wet weather.")
        risks.append(
            PersonaCard(
                id="crop_risk_humidity",
                title="Crop Stress: High Humidity",
                summary=f"Humidity {c.humidity:.0f}% with rain chance {rain:.0f}%",
                detail=disease_note,
                recommendation="Scout fields; weather-derived note is not an official plant-protection advisory.",
                supporting_data={"humidity_pct": c.humidity, "rain_probability_pct": round(rain), "crop": farmer.crop},
                provenance="derived",
                source_label="MAUSAM derived (not plant-protection authority)",
                updated_at=_iso_now(),
                reason=f"Shown because humidity and rain raise disease risk for {crop} at {stage}.",
                label="Derived crop risk",
                severity="watch",
            )
        )
    if c.wind_speed >= 35 and farmer.crop in _WIND_SENSITIVE_CROPS:
        risks.append(
            PersonaCard(
                id="crop_risk_wind",
                title="Crop Stress: Strong Wind",
                summary=f"Wind {c.wind_speed:.0f} km/h — lodging risk for {crop}",
                detail="Strong winds can lodge cereal crops, especially after rain.",
                recommendation="Avoid spraying in high wind; inspect for lodging after the gusty spell.",
                supporting_data={"wind_kmh": c.wind_speed, "crop": farmer.crop},
                provenance="derived",
                source_label="MAUSAM derived",
                updated_at=_iso_now(),
                reason=f"Shown because {crop} can lodge in strong winds at {stage}.",
                label="Derived crop risk",
                severity="advisory",
            )
        )
    if c.temperature <= 5:
        risks.append(
            PersonaCard(
                id="crop_risk_frost",
                title="Crop Stress: Cold / Frost Risk",
                summary=f"{c.temperature:.0f}°C — frost protection may be needed",
                detail="Cold nights can damage sensitive stages.",
                recommendation="Consider frost protection for sensitive crops; irrigate lightly if advised locally.",
                supporting_data={"temperature_c": c.temperature, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label="MAUSAM derived",
                updated_at=_iso_now(),
                reason=f"Shown because low temperature can stress {crop} at {stage}.",
                label="Derived crop risk",
                severity="warning",
            )
        )
    if not risks:
        risks.append(
            PersonaCard(
                id="crop_risk_ok",
                title="Crop Weather Risk",
                summary=f"No major weather stress flags for {crop} ({stage}) right now",
                detail="Based on temperature, humidity, wind, and rain probability thresholds.",
                recommendation="Continue routine scouting; re-check after forecast updates.",
                supporting_data={"crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label="MAUSAM derived",
                updated_at=_iso_now(),
                reason=f"Shown because your farmer profile ({crop}, {stage}) drives crop-risk monitoring.",
                label="Derived crop risk",
                severity="info",
            )
        )
    return risks


def _farm_forecast_card(forecast: ForecastResponse | None, farmer: FarmerProfile) -> PersonaCard:
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.title())
    days = (forecast.daily[:5] if forecast and forecast.daily else [])
    lines = []
    for d in days:
        lines.append(
            {
                "date": d.date,
                "temp_max": d.temp_max,
                "temp_min": d.temp_min,
                "rain_probability_pct": d.precipitation_probability_max,
                "condition": d.condition_group,
            }
        )
    wet_days = sum(1 for d in days if (d.precipitation_probability_max or 0) >= 50)
    summary = (
        f"{wet_days} of next {len(days) or 5} days look wet — plan field work around rain"
        if wet_days
        else f"Next {len(days) or 5} days look relatively dry for {crop}"
    )
    return PersonaCard(
        id="farm_forecast",
        title="5-Day Farm Forecast",
        summary=summary,
        detail=f"Farm-oriented outlook emphasizing rainfall and temperature for {crop} at {stage}.",
        recommendation=(
            "Schedule irrigation, spraying, and harvest around the wetter days listed in supporting data."
        ),
        supporting_data={"days": lines, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
        provenance="derived",
        source_label=forecast.source if forecast else "forecast unavailable",
        updated_at=_iso_now(),
        reason=f"Shown because farmers need multi-day rain/temp outlook for {crop} ({stage}).",
        label="Farm forecast emphasis",
        severity="info",
        accent="sky",
    )


def _crop_stage_card(farmer: FarmerProfile, location_name: str) -> PersonaCard:
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.title())
    extras = []
    if farmer.irrigation_type:
        extras.append(f"Irrigation: {farmer.irrigation_type}")
    if farmer.field_size_ha is not None:
        extras.append(f"Field: {farmer.field_size_ha:g} ha")
    if farmer.sowing_date:
        extras.append(f"Sown: {farmer.sowing_date}")
    return PersonaCard(
        id="crop_stage",
        title="Crop & Stage",
        summary=f"{crop} · {stage}",
        detail=f"Location: {location_name}. " + (" · ".join(extras) if extras else "Profile drives advisory context."),
        recommendation="Update crop/stage in Profile if your field status changes — homepage guidance follows this context.",
        supporting_data=farmer.model_dump(),
        provenance="derived",
        source_label="Your farm profile",
        updated_at=_iso_now(),
        reason=f"Shown because your Farmer profile sets crop={crop} and stage={stage} for this location.",
        label="Farm profile context",
        severity="info",
        accent="emerald",
    )


def _agromet_card(status: AgrometAdvisoryStatus, farmer: FarmerProfile) -> PersonaCard:
    crop = _CROP_LABELS.get(farmer.crop, farmer.crop.title())
    stage = _STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage.title())
    if status.available and status.advisory_text:
        return PersonaCard(
            id="agromet_advisory",
            title="Official IMD Agromet Advisory",
            summary=status.advisory_text[:180],
            detail=status.message,
            recommendation=" ".join(status.recommendations) if status.recommendations else "",
            supporting_data={
                "weather_condition": status.weather_condition,
                "crop_relevance": status.crop_relevance or farmer.crop,
                "crop_stage_relevance": status.crop_stage_relevance or farmer.crop_stage,
                "language": status.language,
                "portal_url": status.portal_url,
            },
            provenance="official",
            source_label=status.source_label,
            issued_at=status.issued_at,
            updated_at=status.updated_at,
            reason=f"Official IMD Agromet advisory matched for {crop} ({stage}).",
            label="Official IMD Agromet",
            severity="advisory",
            accent="emerald",
        )
    return PersonaCard(
        id="agromet_advisory",
        title="Official IMD Agromet Advisory",
        summary="Official crop advisory currently unavailable",
        detail=status.message,
        recommendation=(
            f"Open the official KALP portal for location + {crop} + {stage} advisories. "
            "MAUSAM still shows weather-derived farm guidance separately and will never label it as IMD Agromet."
        ),
        supporting_data={
            "status": status.status,
            "portal_url": status.portal_url,
            "crop": farmer.crop,
            "crop_stage": farmer.crop_stage,
        },
        provenance="unavailable",
        source_label=status.source_label,
        updated_at=_iso_now(),
        reason=(
            f"Shown because your profile is Farmer ({crop}, {stage}); we surface an honest "
            "official-advisory status instead of inventing IMD text."
        ),
        label="Official source not connected",
        severity="info",
        accent="mist",
    )


async def build_farmer_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
) -> PersonaHomePayload:
    agromet = await fetch_official_agromet_advisory(
        weather.location.lat, weather.location.lon, farmer=farmer
    )
    cards = [
        _crop_stage_card(farmer, weather.location.name),
        _agromet_card(agromet, farmer),
        _irrigation_card(weather, forecast, farmer),
        _soil_moisture_card(weather, forecast, farmer),
        *_crop_risk_cards(weather, forecast, farmer),
        _farm_forecast_card(forecast, farmer),
    ]
    return PersonaHomePayload(
        persona="farmer",
        section_order=PERSONA_SECTION_ORDER["farmer"],
        hero_title="Farm Weather",
        hero_subtitle=f"{_CROP_LABELS.get(farmer.crop, farmer.crop)} · {_STAGE_LABELS.get(farmer.crop_stage, farmer.crop_stage)}",
        metric_priority=PERSONA_METRIC_PRIORITY["farmer"],
        cards=cards,
        agromet=agromet,
        quick_actions=["irrigation", "crop_risk", "farm_forecast", "alerts"],
    )


def _best_run_windows(forecast: ForecastResponse | None, weather: WeatherResponse) -> PersonaCard:
    hours = (forecast.hourly[:24] if forecast and forecast.hourly else [])
    windows: list[dict] = []
    for h in hours:
        rain = h.precipitation_probability or 0
        uv = h.uv_index if h.uv_index is not None else 0
        score = 100 - rain * 0.7 - max(0, (uv - 5)) * 8
        if weather.current.humidity > 80:
            score -= 10
        if score >= 65 and rain < 40:
            windows.append(
                {
                    "time": h.time,
                    "temp_c": h.temperature,
                    "rain_probability_pct": rain,
                    "uv_index": uv,
                    "score": round(score),
                }
            )
    windows = sorted(windows, key=lambda w: w["score"], reverse=True)[:3]
    if weather.current.temperature > 28:
        default_summary = "Prefer early morning (6–8 AM) or after sunset"
    else:
        default_summary = "Conditions allow flexible run timing today"
    summary = (
        f"Best windows: {', '.join(w['time'][11:16] for w in windows[:2])}"
        if windows
        else default_summary
    )
    return PersonaCard(
        id="best_run_time",
        title="Best Time to Run",
        summary=summary,
        detail="Scored from hourly rain probability, UV, and comfort. Severe alerts still override outdoor plans.",
        recommendation="Carry water; avoid peak UV if your top windows fall near midday.",
        supporting_data={"windows": windows, "humidity_pct": weather.current.humidity},
        provenance="derived",
        source_label="MAUSAM derived",
        updated_at=_iso_now(),
        reason="Shown because your profile is Fitness and run timing depends on rain, UV, and heat.",
        label="Fitness recommendation",
        severity="info",
        accent="sky",
    )


def build_runner_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
) -> PersonaHomePayload:
    c = weather.current
    rain = _rain_today(forecast)
    aqi_val = air_quality.us_aqi if air_quality else None
    cards = [
        _best_run_windows(forecast, weather),
        PersonaCard(
            id="heat_humidity",
            title="Heat + Humidity",
            summary=f"{c.temperature:.0f}°C · Humidity {c.humidity:.0f}% · Feels {c.feels_like:.0f}°C",
            detail="Heat stress rises when both temperature and humidity are elevated.",
            recommendation=(
                "Shorten the run and hydrate more frequently."
                if c.temperature >= 32 or c.humidity >= 75
                else "Heat load looks manageable for a normal session."
            ),
            supporting_data={"temperature_c": c.temperature, "humidity_pct": c.humidity, "feels_like_c": c.feels_like},
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because Fitness profiles need heat/humidity context for outdoor running.",
            label="Fitness recommendation",
            severity="advisory" if c.temperature >= 35 else "info",
        ),
        PersonaCard(
            id="aqi",
            title="AQI / PM2.5",
            summary=(
                f"AQI {aqi_val} ({air_quality.category}) · PM2.5 {air_quality.pm2_5:.0f}"
                if air_quality and aqi_val is not None and air_quality.pm2_5 is not None
                else (f"AQI {aqi_val} ({air_quality.category})" if air_quality and aqi_val is not None else "AQI unavailable")
            ),
            detail="Outdoor fitness is sensitive to air quality, especially for longer runs.",
            recommendation=(
                "Consider an indoor workout if AQI is unhealthy."
                if aqi_val is not None and aqi_val >= 150
                else "Air quality looks acceptable for outdoor exercise."
            ),
            supporting_data={
                "us_aqi": aqi_val,
                "pm2_5": air_quality.pm2_5 if air_quality else None,
                "category": air_quality.category if air_quality else None,
                "source": air_quality.source if air_quality else None,
            },
            provenance="derived",
            source_label=air_quality.source if air_quality else "unavailable",
            updated_at=_iso_now(),
            reason="Shown because your profile is Fitness and AQI affects outdoor running safety.",
            label="Air quality for running",
            severity="warning" if aqi_val and aqi_val >= 150 else "info",
        ),
        PersonaCard(
            id="uv",
            title="UV Index",
            summary=f"UV {c.uv_index:.0f}" if c.uv_index is not None else "UV unavailable",
            detail="High UV increases sun exposure during daytime runs.",
            recommendation="Use sunscreen and prefer shade/early hours when UV is high.",
            supporting_data={"uv_index": c.uv_index},
            provenance="derived",
            source_label="Current weather",
            updated_at=c.observed_at,
            reason="Shown because UV exposure matters for daytime outdoor fitness.",
            label="Fitness recommendation",
            severity="advisory" if (c.uv_index or 0) >= 7 else "info",
        ),
        PersonaCard(
            id="rain",
            title="Rain Probability",
            summary=f"{rain:.0f}% chance of rain today",
            detail="Rain affects trail safety and clothing choices.",
            recommendation="Carry a light shell if rain exceeds 40%.",
            supporting_data={"rain_probability_pct": round(rain)},
            provenance="derived",
            source_label=forecast.source if forecast else "forecast",
            updated_at=_iso_now(),
            reason="Shown because rain probability shapes outdoor running plans.",
            label="Fitness recommendation",
            severity="watch" if rain >= 50 else "info",
        ),
        PersonaCard(
            id="wind",
            title="Wind",
            summary=f"{c.wind_speed:.0f} km/h",
            detail="Strong headwinds increase effort; gusts affect safety on exposed routes.",
            recommendation="Choose sheltered routes if winds exceed ~30 km/h.",
            supporting_data={"wind_kmh": c.wind_speed, "wind_direction": c.wind_direction},
            provenance="derived",
            source_label="Current weather",
            updated_at=c.observed_at,
            reason="Shown because wind affects running effort and comfort.",
            label="Fitness recommendation",
            severity="watch" if c.wind_speed >= 30 else "info",
        ),
        PersonaCard(
            id="hydration",
            title="Hydration / Clothing",
            summary=(
                "Light clothing + extra water"
                if c.temperature >= 30
                else ("Layer up" if c.temperature <= 15 else "Standard running kit")
            ),
            detail="Derived from temperature, humidity, and rain chance.",
            recommendation=(
                f"Temperature {c.temperature:.0f}°C, humidity {c.humidity:.0f}%, rain {rain:.0f}%."
            ),
            supporting_data={"temperature_c": c.temperature, "humidity_pct": c.humidity, "rain_probability_pct": round(rain)},
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because Fitness profiles need clothing/hydration cues from live weather.",
            label="Fitness recommendation",
            severity="info",
        ),
        PersonaCard(
            id="hourly_run",
            title="Hourly Running Conditions",
            summary="Next hours scored for rain and UV",
            detail="Use Best Time to Run for top windows; hourly chart remains below for detail.",
            recommendation="Tap expand for the same supporting hourly shortlist used in Best Time to Run.",
            supporting_data={"note": "See best_run_time windows"},
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because runners plan around hourly condition changes.",
            label="Fitness recommendation",
            severity="info",
        ),
    ]
    return PersonaHomePayload(
        persona="runner",
        section_order=PERSONA_SECTION_ORDER["runner"],
        hero_title="Fitness Weather",
        hero_subtitle="Run-ready conditions for your location",
        metric_priority=PERSONA_METRIC_PRIORITY["runner"],
        cards=cards,
        quick_actions=["best_run_time", "aqi", "uv", "alerts"],
    )


def build_traveller_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
) -> PersonaHomePayload:
    c = weather.current
    rain = _rain_today(forecast)
    vis = c.visibility
    stormy = c.condition_group in ("storm", "rain") or rain >= 60
    risk_bits = []
    if stormy:
        risk_bits.append("rain/storm")
    if vis is not None and vis < 3:
        risk_bits.append("low visibility")
    if c.wind_speed >= 35:
        risk_bits.append("strong wind")
    risk_summary = (
        "Elevated travel caution: " + ", ".join(risk_bits)
        if risk_bits
        else "Travel conditions look manageable"
    )
    packing = []
    if rain >= 40 or c.condition_group in ("rain", "drizzle", "storm"):
        packing.append("compact umbrella / raincoat")
    if c.temperature >= 30:
        packing.append("light clothing + sunscreen")
    if c.temperature <= 15:
        packing.append("warm layer")
    if not packing:
        packing.append("light everyday kit")

    cards = [
        PersonaCard(
            id="travel_risk",
            title="Travel Risk",
            summary=risk_summary,
            detail="Combines rain/thunderstorm likelihood, visibility, and wind.",
            recommendation="Allow extra time if rain or low visibility is flagged.",
            supporting_data={
                "rain_probability_pct": round(rain),
                "visibility_km": vis,
                "wind_kmh": c.wind_speed,
                "condition_group": c.condition_group,
            },
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because your profile is Traveller and visibility/rain/wind may affect travel.",
            label="Travel recommendation",
            severity="advisory" if risk_bits else "info",
            accent="amber",
        ),
        PersonaCard(
            id="rain",
            title="Rain / Thunderstorm",
            summary=f"{rain:.0f}% rain chance · {c.condition}",
            detail="Stormy conditions slow road travel and outdoor connections.",
            recommendation="Keep waterproof cover handy if rain chance is material.",
            supporting_data={"rain_probability_pct": round(rain), "condition": c.condition},
            provenance="derived",
            source_label=forecast.source if forecast else "weather",
            updated_at=_iso_now(),
            reason="Shown because rain/thunderstorm risk is a primary travel concern.",
            label="Travel recommendation",
            severity="watch" if rain >= 50 else "info",
        ),
        PersonaCard(
            id="visibility",
            title="Visibility",
            summary=f"{vis:.1f} km" if vis is not None else "Visibility unavailable",
            detail="Fog and haze reduce safe driving speeds.",
            recommendation="Use fog lights and reduce speed if visibility drops below 3 km.",
            supporting_data={"visibility_km": vis},
            provenance="derived",
            source_label="Current weather",
            updated_at=c.observed_at,
            reason="Shown because Traveller profiles prioritize road visibility.",
            label="Travel recommendation",
            severity="advisory" if vis is not None and vis < 3 else "info",
        ),
        PersonaCard(
            id="wind",
            title="Wind",
            summary=f"{c.wind_speed:.0f} km/h",
            detail="High winds affect two-wheelers, high-sided vehicles, and outdoor waits.",
            recommendation="Secure loose items; prefer covered transit waits in strong wind.",
            supporting_data={"wind_kmh": c.wind_speed},
            provenance="derived",
            source_label="Current weather",
            updated_at=c.observed_at,
            reason="Shown because wind can disrupt travel comfort and safety.",
            label="Travel recommendation",
            severity="watch" if c.wind_speed >= 35 else "info",
        ),
        PersonaCard(
            id="temperature",
            title="Temperature",
            summary=f"{c.temperature:.0f}°C (feels {c.feels_like:.0f}°C)",
            detail="Packing and wait-time comfort depend on temperature.",
            recommendation="Dress for feels-like temperature during outdoor transfers.",
            supporting_data={"temperature_c": c.temperature, "feels_like_c": c.feels_like},
            provenance="derived",
            source_label="Current weather",
            updated_at=c.observed_at,
            reason="Shown because Traveller profiles need temperature for packing and comfort.",
            label="Travel recommendation",
            severity="info",
        ),
        PersonaCard(
            id="hourly_travel",
            title="Hourly Travel Outlook",
            summary="Watch the next hours for rain and visibility changes",
            detail="Use the hourly forecast section for full timeline; this card highlights travel relevance.",
            recommendation="Shift outdoor transfers away from peak rain hours when possible.",
            supporting_data={"rain_probability_pct": round(rain)},
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because travellers plan around hourly weather shifts.",
            label="Travel recommendation",
            severity="info",
        ),
        PersonaCard(
            id="packing",
            title="Packing Suggestion",
            summary=", ".join(packing),
            detail="Derived from current conditions and today's rain probability at this location.",
            recommendation="Adjust if your destination differs from the selected location.",
            supporting_data={"items": packing, "rain_probability_pct": round(rain)},
            provenance="derived",
            source_label="MAUSAM derived",
            updated_at=_iso_now(),
            reason="Shown because your profile is Traveller and packing depends on rain and temperature.",
            label="Travel recommendation",
            severity="info",
            accent="sky",
        ),
    ]
    return PersonaHomePayload(
        persona="traveller",
        section_order=PERSONA_SECTION_ORDER["traveller"],
        hero_title="Travel Weather",
        hero_subtitle="Risk, visibility, and packing for the road",
        metric_priority=PERSONA_METRIC_PRIORITY["traveller"],
        cards=cards,
        quick_actions=["travel_risk", "visibility", "packing", "alerts"],
    )


def build_stub_payload(persona: PersonaId) -> PersonaHomePayload:
    """Architecture-ready stubs for personas not fully specialized yet."""
    titles = {
        "marine": ("Marine Weather", "Waves, wind, and coastal safety — specialized marine APIs expand here"),
        "family": ("Family Weather", "School commute and outdoor family plans"),
        "health_vulnerable": ("Health Weather", "AQI, heat, and comfort for vulnerable users"),
        "disaster": ("Emergency Weather", "Warnings-first layout for disaster readiness"),
    }
    title, subtitle = titles.get(persona, ("Weather", "Personalized homepage"))
    return PersonaHomePayload(
        persona=persona,
        section_order=PERSONA_SECTION_ORDER[persona],
        hero_title=title,
        hero_subtitle=subtitle,
        metric_priority=PERSONA_METRIC_PRIORITY[persona],
        cards=[],
        quick_actions=["alerts"],
    )


async def build_persona_home(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
    profile: PersonaProfile | None = None,
) -> PersonaHomePayload:
    persona = resolve_persona(interests, profile)
    if persona == "farmer":
        farmer = (profile.farmer if profile and profile.farmer else None) or FarmerProfile()
        return await build_farmer_payload(weather, forecast, farmer)
    if persona == "runner":
        return build_runner_payload(weather, forecast, air_quality)
    if persona == "traveller":
        return build_traveller_payload(weather, forecast)
    return build_stub_payload(persona)
