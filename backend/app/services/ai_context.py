"""Centralized MAUSAM AI context builder.

Builds grounded, provenance-aware context for the assistant. Never invents values —
unavailable / estimated / model / official distinctions are explicit in the text.
"""
from __future__ import annotations

from typing import Any

from ..models.alerts import WeatherAlert
from ..models.environment import AirQualityResponse, MarineResponse
from ..models.persona import AgrometAdvisoryStatus, PersonaHomePayload, PersonaProfile
from ..models.weather import ForecastResponse, WeatherResponse


def _fmt(value: float | None, suffix: str = "", digits: int = 0) -> str:
    if value is None:
        return "unavailable"
    if digits == 0:
        return f"{value:.0f}{suffix}"
    return f"{value:.{digits}f}{suffix}"


def _field_line(label: str, value: float | None, unit: str, weather: WeatherResponse, field: str) -> str:
    src = None
    cat = None
    if weather.field_sources and field in weather.field_sources:
        prov = weather.field_sources[field]
        src = prov.source
        cat = prov.category
    if value is None:
        return f"{label}: unavailable"
    extra = ""
    if src or cat:
        extra = f" [source={src or 'unknown'}; provenance={cat or 'unknown'}]"
    return f"{label}: {_fmt(value, unit, 1 if unit in (' km',) else 0)}{extra}"


def _is_complex_question(message: str) -> bool:
    lower = message.lower()
    decision_markers = (
        "should i",
        "best time",
        "is it safe",
        "is it good",
        "suitable",
        "recommend",
        "irrigat",
        "when should",
        "can i",
        "will it",
        "क्या",
        "कब",
        "चाहिए",
        "ठीक",
        "सलाह",
        "सिंचाई",
        "दौड़",
        "यात्रा",
        "समुद्र",
    )
    simple_markers = (
        "what is the temperature",
        "what's the temperature",
        "current temperature",
        "humidity",
        "uv index",
        "pressure",
        "तापमान क्या",
        "नमी क्या",
    )
    if any(m in lower for m in simple_markers) and not any(m in lower for m in ("should", "best", "safe")):
        return False
    return any(m in lower for m in decision_markers) or len(message.split()) >= 10


def classify_question_complexity(message: str) -> str:
    """Return 'simple' or 'complex' for DeepSeek thinking-mode routing."""
    return "complex" if _is_complex_question(message) else "simple"


def build_ai_context(
    *,
    weather: WeatherResponse,
    forecast: ForecastResponse | None = None,
    air_quality: AirQualityResponse | None = None,
    alerts: list[WeatherAlert] | None = None,
    nowcast: Any = None,
    persona: PersonaHomePayload | None = None,
    profile: PersonaProfile | None = None,
    marine: MarineResponse | None = None,
    agromet: AgrometAdvisoryStatus | None = None,
    interests: list[str] | None = None,
    locale: str = "en",
) -> str:
    """Assemble grounded context. Missing values are labelled unavailable — never invented."""
    interests = interests or []
    current = weather.current
    lines: list[str] = [
        "=== MAUSAM GROUNDED CONTEXT (do not invent values outside this block) ===",
        f"Location: {weather.location.name} (lat={weather.location.lat:.4f}, lon={weather.location.lon:.4f})",
        f"Observation bundle source label: {weather.provider_label or weather.source}",
        "NOTE: Forecast (if present) is model data, NOT official IMD forecast unless explicitly labelled IMD.",
    ]

    lines.append("--- Current weather ---")
    lines.append(f"Condition: {current.condition} (group={current.condition_group})")
    lines.append(_field_line("Temperature", current.temperature, "°C", weather, "temperature"))
    lines.append(_field_line("Feels like", current.feels_like, "°C", weather, "feels_like"))
    lines.append(_field_line("Humidity", current.humidity, "%", weather, "humidity"))
    lines.append(_field_line("Wind speed", current.wind_speed, " km/h", weather, "wind_speed"))
    lines.append(_field_line("Wind direction", current.wind_direction, "°", weather, "wind_direction"))
    lines.append(_field_line("Pressure", current.pressure, " hPa", weather, "pressure"))
    lines.append(_field_line("Visibility", current.visibility, " km", weather, "visibility"))
    lines.append(_field_line("UV index", current.uv_index, "", weather, "uv_index"))
    lines.append(_field_line("Precipitation", current.precipitation, " mm", weather, "precipitation"))
    lines.append(f"Observed at: {current.observed_at}")

    if air_quality is not None:
        lines.append("--- Air quality ---")
        aqi = air_quality.us_aqi
        lines.append(
            f"US AQI: {_fmt(float(aqi) if aqi is not None else None)} ({air_quality.category}) "
            f"[source={air_quality.source}; provenance=Model]"
        )
        lines.append(f"PM2.5: {_fmt(air_quality.pm2_5, digits=1)}")
    else:
        lines.append("--- Air quality ---\nAQI: unavailable")

    if forecast is not None:
        lines.append(
            f"--- Forecast (provider={forecast.source}; "
            f"label={forecast.provider_label or 'Model / Open-Meteo'}; NOT official IMD) ---"
        )
        if forecast.hourly:
            for h in forecast.hourly[:12]:
                lines.append(
                    f"  {h.time}: {h.temperature:.0f}°C, {h.condition_group}, "
                    f"rain_prob={_fmt(h.precipitation_probability, '%')}, "
                    f"uv={_fmt(h.uv_index)}, wind={_fmt(h.wind_speed, ' km/h')}"
                )
        if forecast.daily:
            for d in forecast.daily[:3]:
                lines.append(
                    f"  {d.date}: {d.temp_min:.0f}-{d.temp_max:.0f}°C, {d.condition_group}, "
                    f"rain_prob_max={_fmt(d.precipitation_probability_max, '%')}"
                )
        rain_now = forecast.hourly[0].precipitation_probability if forecast.hourly else None
        lines.append(f"Near-term rain probability: {_fmt(rain_now, '%')}")
    else:
        lines.append("--- Forecast ---\nunavailable")

    if alerts:
        lines.append("--- Alerts ---")
        for a in alerts[:8]:
            lines.append(
                f"  [{a.severity}/{a.source}] {a.title}: {a.description[:180]}"
            )
    else:
        lines.append("--- Alerts ---\nnone supplied")

    if nowcast is not None:
        lines.append(f"--- Nowcast ---\n{nowcast}")

    # Persona / profile
    persona_id = (persona.persona if persona else None) or (
        profile.primary_persona if profile and profile.primary_persona else None
    )
    if interests:
        lines.append(f"User interests: {', '.join(interests)}")
    if persona_id:
        lines.append(f"Active persona: {persona_id}")

    farmer = profile.farmer if profile else None
    if persona_id == "farmer" or (interests and "agriculture" in interests) or farmer:
        lines.append("--- Farmer context ---")
        if farmer:
            lines.append(f"Crop: {farmer.crop or 'unavailable'}")
            lines.append(f"Crop stage: {farmer.crop_stage or 'unavailable'}")
            lines.append(f"Sowing date: {farmer.sowing_date or 'unavailable'}")
            lines.append(f"Irrigation type: {farmer.irrigation_type or 'unavailable'}")
            lines.append(f"Field size (ha): {farmer.field_size_ha if farmer.field_size_ha is not None else 'unavailable'}")
        if persona and persona.cards:
            for card in persona.cards:
                if card.provenance in ("estimated", "derived") or card.id in (
                    "irrigation",
                    "soil_moisture",
                    "crop_risk",
                    "agromet",
                    "farm_forecast",
                ):
                    lines.append(
                        f"Card[{card.id}] provenance={card.provenance} source={card.source_label}: "
                        f"{card.summary} | rec={card.recommendation}"
                    )
        if agromet is not None:
            lines.append(
                f"Official Agromet: available={agromet.available} status={agromet.status} "
                f"source={agromet.source_label or 'IMD Agromet'}"
            )
            if agromet.available and agromet.message:
                lines.append(f"Agromet advisory text: {agromet.message[:500]}")
            else:
                lines.append(
                    "Official Agromet advisory: UNAVAILABLE — do not invent crop advisory text. "
                    f"Portal: {agromet.portal_url or 'https://webgis.imd.gov.in/agro'}"
                )
        else:
            lines.append(
                "Official Agromet advisory: UNAVAILABLE in this request — do not invent crop advisories."
            )
        lines.append(
            "RULE: Estimated soil moisture / derived irrigation notes are NOT IMD observations. "
            "Say 'estimated' or 'derived' when citing them."
        )

    if persona_id == "runner" or (interests and "outdoor_fitness" in interests):
        lines.append("--- Runner / fitness context ---")
        lines.append("Use temperature, humidity, UV, AQI, rain probability, alerts for run advice.")
        if persona and persona.cards:
            for card in persona.cards[:6]:
                lines.append(f"Card[{card.id}]: {card.summary} | {card.recommendation}")

    if persona_id == "traveller" or (interests and "travel" in interests):
        lines.append("--- Traveller context ---")
        lines.append("Use visibility, rain, wind, alerts, hourly travel conditions.")
        if persona and persona.cards:
            for card in persona.cards[:6]:
                lines.append(f"Card[{card.id}]: {card.summary} | {card.recommendation}")

    if marine is not None and marine.available and marine.current:
        lines.append("--- Marine context ---")
        lines.append(
            f"Wave/swell provider: {marine.wave_source or marine.source} "
            "(MODELLED forecast — not official INCOIS observations)"
        )
        m = marine.current
        lines.append(f"Wave height: {_fmt(m.wave_height, ' m', 1)}")
        lines.append(f"Wave period: {_fmt(m.wave_period, ' s', 0)}")
        lines.append(f"Wave direction: {_fmt(m.wave_direction, '°', 0)}")
        lines.append(f"Swell height: {_fmt(m.swell_wave_height, ' m', 1)}")
        lines.append(f"Swell period: {_fmt(m.swell_wave_period, ' s', 0)}")
        lines.append(f"Swell direction: {_fmt(m.swell_wave_direction, '°', 0)}")
        lines.append(f"Ocean current: {_fmt(m.ocean_current_velocity, ' m/s', 2)}")
        lines.append(f"Current direction: {_fmt(m.ocean_current_direction, '°', 0)}")
        lines.append(f"Sea surface temperature: {_fmt(m.sea_surface_temperature, '°C', 1)}")
        lines.append(f"Sea level (MSL model): {_fmt(m.sea_level_height_msl, ' m', 2)}")
        lines.append(f"INCOIS status: {marine.incois_status}")
        if marine.tides:
            lines.append(f"Tide source: {marine.tide_source or 'unknown'} (not INCOIS unless labelled)")
            for t in marine.tides[:8]:
                lines.append(f"  Tide {t.type} at {t.time}, height={_fmt(t.height, ' m', 2)}")
        else:
            lines.append("Tides: unavailable (do not invent high/low tide times)")
    elif marine is not None and not marine.available:
        lines.append("--- Marine context ---\nMarine model unavailable for this location")

    lines.append("--- Hard rules for the assistant ---")
    lines.append("1. Prefer official IMD observation fields when provenance=Official.")
    lines.append("2. Label Model / Weatherstack / Derived / Estimated / Unavailable correctly.")
    lines.append("3. Never invent pressure, tides, Agromet advisories, or marine values.")
    lines.append("4. If a field says unavailable, say it is unavailable.")
    lines.append("5. Answer in the user's selected language (locale=" + (locale or "en") + ").")
    lines.append("6. Return ONLY the final user-facing answer — no chain-of-thought.")
    return "\n".join(lines)
