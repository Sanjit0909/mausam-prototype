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
from .persona_locale import (
    aqi_category_label,
    crop_label,
    soil_level_label,
    stage_label,
    t,
    weather_condition_label,
)

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

_HEAT_SENSITIVE_STAGES = {"flowering", "fruiting", "harvest"}
_WATER_SENSITIVE_STAGES = {"sowing", "vegetative", "flowering"}
_WIND_SENSITIVE_CROPS = {"rice", "wheat", "maize"}


def _crop(farmer: FarmerProfile, locale: str) -> str:
    return crop_label(farmer.crop, locale)


def _stage(farmer: FarmerProfile, locale: str) -> str:
    return stage_label(farmer.crop_stage, locale)


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
    locale: str = "en",
) -> tuple[str, str, dict]:
    """Transparent weather-based estimate — never labelled as IMD soil moisture."""
    rain = _rain_today(forecast)
    precip = weather.current.precipitation if weather.current.precipitation is not None else 0.0
    humidity = weather.current.humidity if weather.current.humidity is not None else 50.0
    if rain >= 70 or precip >= 5:
        level_key = "Adequate to high"
        rec = t(
            locale,
            "Field moisture likely sufficient — avoid unnecessary irrigation.",
            "खेत की नमी पर्याप्त लगती है — अनावश्यक सिंचाई से बचें।",
        )
    elif rain >= 40 or humidity >= 75:
        level_key = "Moderate"
        rec = t(
            locale,
            "Monitor field moisture; irrigate only if crop stage requires it.",
            "खेत की नमी की निगरानी करें; सिंचाई केवल तब करें जब फसल अवस्था इसकी माँग करे।",
        )
    elif rain <= 15 and humidity < 45:
        level_key = "Likely dry"
        rec = t(
            locale,
            "Consider irrigation if crop stage is water-sensitive.",
            "यदि फसल अवस्था जल-संवेदनशील हो तो सिंचाई पर विचार करें।",
        )
    else:
        level_key = "Fair"
        rec = t(
            locale,
            "Check field conditions before irrigating.",
            "सिंचाई से पहले खेत की स्थिति जाँचें।",
        )
    level = soil_level_label(level_key, locale)
    data = {
        "rain_probability_today_pct": round(rain),
        "recent_precipitation_mm": precip,
        "humidity_pct": round(humidity) if weather.current.humidity is not None else None,
        "method": t(
            locale,
            "Rule-based estimate from precipitation probability, recent rain, and humidity",
            "वर्षा संभावना, हाल की बारिश और नमी पर आधारित नियम अनुमान",
        ),
    }
    return level, rec, data


def _irrigation_card(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
    locale: str = "en",
) -> PersonaCard:
    rain = _rain_today(forecast)
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
    water_sensitive = farmer.crop_stage in _WATER_SENSITIVE_STAGES
    precip = weather.current.precipitation if weather.current.precipitation is not None else 0.0

    if rain >= 70:
        summary = t(
            locale,
            f"Rain likely ({rain:.0f}%) — irrigation may be deferred",
            f"बारिश की संभावना ({rain:.0f}%) — सिंचाई टाली जा सकती है",
        )
        recommendation = (
            t(
                locale,
                f"For {crop} at {stage}: postpone irrigation and ensure field drainage if heavy rain develops.",
                f"{crop} ({stage}) के लिए: सिंचाई स्थगित रखें और तेज़ बारिश होने पर निकासी सुनिश्चित करें।",
            )
            if water_sensitive
            else t(
                locale,
                f"For {crop} at {stage}: defer irrigation; watch for waterlogging.",
                f"{crop} ({stage}) के लिए: सिंचाई टालें; जलभराव पर नज़र रखें।",
            )
        )
        severity = "advisory"
    elif rain >= 40:
        summary = t(
            locale,
            f"Some rain possible ({rain:.0f}%) — irrigate selectively",
            f"कुछ बारिश संभव ({rain:.0f}%) — चुनिंदा सिंचाई करें",
        )
        recommendation = t(
            locale,
            f"{crop} ({stage}): irrigate only if soil feels dry; rain may cover part of the need.",
            f"{crop} ({stage}): केवल मिट्टी सूखी लगे तब सिंचाई करें; बारिश आवश्यकता का कुछ भाग पूरा कर सकती है।",
        )
        severity = "watch"
    elif rain <= 20 and water_sensitive:
        summary = t(
            locale,
            f"Little rain expected ({rain:.0f}%) — irrigation may be needed",
            f"कम बारिश अपेक्षित ({rain:.0f}%) — सिंचाई की आवश्यकता हो सकती है",
        )
        recommendation = t(
            locale,
            f"{crop} at {stage} is water-sensitive. Plan irrigation if fields are drying.",
            f"{crop} ({stage}) जल-संवेदनशील है। खेत सूख रहे हों तो सिंचाई की योजना बनाएँ।",
        )
        severity = "advisory"
    else:
        summary = t(
            locale,
            f"Rain chance {rain:.0f}% — follow normal irrigation schedule",
            f"वर्षा संभावना {rain:.0f}% — सामान्य सिंचाई अनुसूची अपनाएँ",
        )
        recommendation = t(
            locale,
            f"{crop} ({stage}): maintain your usual irrigation plan and re-check after any showers.",
            f"{crop} ({stage}): अपनी सामान्य सिंचाई योजना बनाए रखें और किसी भी बौछार के बाद फिर जाँचें।",
        )
        severity = "info"

    return PersonaCard(
        id="irrigation",
        title=t(locale, "Rainfall & Irrigation Decision", "वर्षा और सिंचाई निर्णय"),
        summary=summary,
        detail=t(
            locale,
            f"Derived from today's rain probability ({rain:.0f}%), current precipitation "
            f"({precip:.1f} mm), and your crop profile.",
            f"आज की वर्षा संभावना ({rain:.0f}%), वर्तमान वर्षा ({precip:.1f} mm), "
            f"और आपकी फसल प्रोफ़ाइल से व्युत्पन्न।",
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
        source_label=t(locale, "MAUSAM derived (not IMD advisory)", "MAUSAM व्युत्पन्न (IMD सलाह नहीं)"),
        updated_at=_iso_now(),
        reason=t(
            locale,
            f"Shown because your profile is Farmer, your crop is {crop} at {stage} stage, "
            "and rainfall is relevant to irrigation planning.",
            f"यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है, फसल {crop} है "
            f"और अवस्था {stage} है, तथा सिंचाई योजना के लिए वर्षा प्रासंगिक है।",
        ),
        label=t(locale, "Derived farm recommendation", "व्युत्पन्न खेत सुझाव"),
        severity=severity,
        accent="emerald",
    )


def _soil_moisture_card(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
    locale: str = "en",
) -> PersonaCard:
    level, rec, data = _estimate_soil_moisture(weather, forecast, locale)
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
    return PersonaCard(
        id="soil_moisture",
        title=t(locale, "Soil Moisture Status — Estimated", "मिट्टी की नमी — अनुमानित"),
        summary=t(
            locale,
            f"{level} (weather-based estimate)",
            f"{level} (मौसम-आधारित अनुमान)",
        ),
        detail=t(
            locale,
            "No official IMD soil-moisture observation is available through the APIs "
            "configured for this prototype. This estimate uses precipitation probability, "
            "recent rainfall, and humidity only.",
            "इस प्रोटोटाइप में कॉन्फ़िगर किए गए API के माध्यम से कोई आधिकारिक IMD मिट्टी-नमी "
            "अवलोकन उपलब्ध नहीं है। यह अनुमान केवल वर्षा संभावना, हाल की बारिश और नमी का उपयोग करता है।",
        ),
        recommendation=f"{crop} / {stage}: {rec}",
        supporting_data={**data, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
        provenance="estimated",
        source_label=t(locale, "MAUSAM estimate (not IMD observation)", "MAUSAM अनुमान (IMD अवलोकन नहीं)"),
        updated_at=_iso_now(),
        reason=t(
            locale,
            f"Shown because your profile is Farmer ({crop}, {stage}) and soil moisture "
            "helps irrigation decisions when official soil probes are unavailable.",
            f"यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है ({crop}, {stage}) "
            "और आधिकारिक मिट्टी सेंसर न होने पर सिंचाई निर्णय में नमी का अनुमान सहायक है।",
        ),
        label=t(locale, "Estimated — not an official observation", "अनुमानित — आधिकारिक अवलोकन नहीं"),
        severity="info",
        accent="amber",
    )


def _crop_risk_cards(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
    locale: str = "en",
) -> list[PersonaCard]:
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
    risks: list[PersonaCard] = []
    c = weather.current
    rain = _rain_today(forecast)
    derived_label = t(locale, "Derived crop risk", "व्युत्पन्न फसल जोखिम")
    mausam_derived = t(locale, "MAUSAM derived", "MAUSAM व्युत्पन्न")

    if rain >= 70:
        risks.append(
            PersonaCard(
                id="crop_risk_rain",
                title=t(locale, "Crop Stress: Heavy Rain Risk", "फसल तनाव: भारी वर्षा जोखिम"),
                summary=t(
                    locale,
                    f"High rain chance ({rain:.0f}%) may stress {crop} at {stage}",
                    f"उच्च वर्षा संभावना ({rain:.0f}%) {crop} ({stage}) पर दबाव डाल सकती है",
                ),
                detail=t(
                    locale,
                    "Derived risk from forecast precipitation probability.",
                    "पूर्वानुमान वर्षा संभावना से व्युत्पन्न जोखिम।",
                ),
                recommendation=(
                    t(
                        locale,
                        "Ensure drainage channels are clear. Delay fertilizer if heavy rain is expected.",
                        "निकासी नालियाँ साफ रखें। तेज़ बारिश अपेक्षित हो तो उर्वरक टालें।",
                    )
                    if farmer.crop_stage in {"vegetative", "flowering", "fruiting"}
                    else t(
                        locale,
                        "Protect harvested produce and delay field operations if rain is heavy.",
                        "कटी फसल सुरक्षित रखें और तेज़ बारिश हो तो खेत के काम स्थगित करें।",
                    )
                ),
                supporting_data={"rain_probability_pct": round(rain), "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label=mausam_derived,
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because you farm {crop} at {stage} and rainfall risk is elevated.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि आप {crop} ({stage}) उगाते हैं और वर्षा जोखिम बढ़ा है।",
                ),
                label=derived_label,
                severity="warning" if rain >= 85 else "advisory",
            )
        )
    if c.temperature >= 38 and farmer.crop_stage in _HEAT_SENSITIVE_STAGES:
        risks.append(
            PersonaCard(
                id="crop_risk_heat",
                title=t(locale, "Crop Stress: Heat", "फसल तनाव: गर्मी"),
                summary=t(
                    locale,
                    f"{c.temperature:.0f}°C — heat stress risk for {crop} ({stage})",
                    f"{c.temperature:.0f}°C — {crop} ({stage}) के लिए गर्मी तनाव का जोखिम",
                ),
                detail=t(
                    locale,
                    "Flowering and grain-filling stages are especially heat-sensitive.",
                    "फूल आने और दाना भरने की अवस्थाएँ विशेष रूप से गर्मी-संवेदनशील होती हैं।",
                ),
                recommendation=t(
                    locale,
                    "Irrigate in early morning/evening if needed; avoid midday spraying.",
                    "आवश्यक हो तो सुबह/शाम सिंचाई करें; दोपहर के छिड़काव से बचें।",
                ),
                supporting_data={"temperature_c": c.temperature, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label=mausam_derived,
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because {crop} at {stage} is heat-sensitive and temperature is high.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि {crop} ({stage}) गर्मी-संवेदनशील है और तापमान ऊँचा है।",
                ),
                label=derived_label,
                severity="advisory",
            )
        )
    if c.humidity is not None and c.humidity >= 80 and rain >= 40:
        disease_note = {
            "rice": t(
                locale,
                "Watch for blast / sheath blight pressure in humid wet spells.",
                "नम गीले मौसम में ब्लास्ट / शीथ ब्लाइट दबाव पर नज़र रखें।",
            ),
            "wheat": t(
                locale,
                "Watch for rust / fungal pressure in humid conditions.",
                "नम स्थितियों में रस्ट / फफूंद दबाव पर नज़र रखें।",
            ),
            "cotton": t(
                locale,
                "Watch for boll rot / fungal issues in humid wet weather.",
                "नम गीले मौसम में बॉल रॉट / फफूंद समस्याओं पर नज़र रखें।",
            ),
        }.get(
            farmer.crop,
            t(
                locale,
                "Monitor for fungal disease pressure in humid wet weather.",
                "नम गीले मौसम में फफूंद रोग दबाव की निगरानी करें।",
            ),
        )
        risks.append(
            PersonaCard(
                id="crop_risk_humidity",
                title=t(locale, "Crop Stress: High Humidity", "फसल तनाव: उच्च नमी"),
                summary=t(
                    locale,
                    f"Humidity {c.humidity:.0f}% with rain chance {rain:.0f}%",
                    f"नमी {c.humidity:.0f}% और वर्षा संभावना {rain:.0f}%",
                ),
                detail=disease_note,
                recommendation=t(
                    locale,
                    "Scout fields; weather-derived note is not an official plant-protection advisory.",
                    "खेतों का निरीक्षण करें; मौसम-व्युत्पन्न नोट आधिकारिक पादप-संरक्षण सलाह नहीं है।",
                ),
                supporting_data={"humidity_pct": c.humidity, "rain_probability_pct": round(rain), "crop": farmer.crop},
                provenance="derived",
                source_label=t(
                    locale,
                    "MAUSAM derived (not plant-protection authority)",
                    "MAUSAM व्युत्पन्न (पादप-संरक्षण प्राधिकरण नहीं)",
                ),
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because humidity and rain raise disease risk for {crop} at {stage}.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि नमी और बारिश {crop} ({stage}) के रोग जोखिम को बढ़ाती हैं।",
                ),
                label=derived_label,
                severity="watch",
            )
        )
    if c.wind_speed is not None and c.wind_speed >= 35 and farmer.crop in _WIND_SENSITIVE_CROPS:
        risks.append(
            PersonaCard(
                id="crop_risk_wind",
                title=t(locale, "Crop Stress: Strong Wind", "फसल तनाव: तेज़ हवा"),
                summary=t(
                    locale,
                    f"Wind {c.wind_speed:.0f} km/h — lodging risk for {crop}",
                    f"हवा {c.wind_speed:.0f} km/h — {crop} के गिरने का जोखिम",
                ),
                detail=t(
                    locale,
                    "Strong winds can lodge cereal crops, especially after rain.",
                    "तेज़ हवाएँ अनाज फसलों को गिरा सकती हैं, खासकर बारिश के बाद।",
                ),
                recommendation=t(
                    locale,
                    "Avoid spraying in high wind; inspect for lodging after the gusty spell.",
                    "तेज़ हवा में छिड़काव से बचें; झोंकेदार मौसम के बाद गिरने की जाँच करें।",
                ),
                supporting_data={"wind_kmh": c.wind_speed, "crop": farmer.crop},
                provenance="derived",
                source_label=mausam_derived,
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because {crop} can lodge in strong winds at {stage}.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि {crop} ({stage}) तेज़ हवा में गिर सकती है।",
                ),
                label=derived_label,
                severity="advisory",
            )
        )
    if c.temperature <= 5:
        risks.append(
            PersonaCard(
                id="crop_risk_frost",
                title=t(locale, "Crop Stress: Cold / Frost Risk", "फसल तनाव: ठंड / पाला जोखिम"),
                summary=t(
                    locale,
                    f"{c.temperature:.0f}°C — frost protection may be needed",
                    f"{c.temperature:.0f}°C — पाला सुरक्षा की आवश्यकता हो सकती है",
                ),
                detail=t(
                    locale,
                    "Cold nights can damage sensitive stages.",
                    "ठंडी रातें संवेदनशील अवस्थाओं को नुकसान पहुँचा सकती हैं।",
                ),
                recommendation=t(
                    locale,
                    "Consider frost protection for sensitive crops; irrigate lightly if advised locally.",
                    "संवेदनशील फसलों के लिए पाला सुरक्षा पर विचार करें; यदि स्थानीय सलाह हो तो हल्की सिंचाई करें।",
                ),
                supporting_data={"temperature_c": c.temperature, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label=mausam_derived,
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because low temperature can stress {crop} at {stage}.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि कम तापमान {crop} ({stage}) पर तनाव डाल सकता है।",
                ),
                label=derived_label,
                severity="warning",
            )
        )
    if not risks:
        risks.append(
            PersonaCard(
                id="crop_risk_ok",
                title=t(locale, "Crop Weather Risk", "फसल मौसम जोखिम"),
                summary=t(
                    locale,
                    f"No major weather stress flags for {crop} ({stage}) right now",
                    f"इस समय {crop} ({stage}) के लिए कोई बड़ा मौसम तनाव संकेत नहीं",
                ),
                detail=t(
                    locale,
                    "Based on temperature, humidity, wind, and rain probability thresholds.",
                    "तापमान, नमी, हवा और वर्षा संभावना सीमाओं पर आधारित।",
                ),
                recommendation=t(
                    locale,
                    "Continue routine scouting; re-check after forecast updates.",
                    "नियमित निरीक्षण जारी रखें; पूर्वानुमान अपडेट के बाद फिर जाँचें।",
                ),
                supporting_data={"crop": farmer.crop, "crop_stage": farmer.crop_stage},
                provenance="derived",
                source_label=mausam_derived,
                updated_at=_iso_now(),
                reason=t(
                    locale,
                    f"Shown because your farmer profile ({crop}, {stage}) drives crop-risk monitoring.",
                    f"यह इसलिए दिखाया जा रहा है क्योंकि आपकी किसान प्रोफ़ाइल ({crop}, {stage}) फसल-जोखिम निगरानी चलाती है।",
                ),
                label=derived_label,
                severity="info",
            )
        )
    return risks


def _farm_forecast_card(
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
    locale: str = "en",
) -> PersonaCard:
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
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
    n = len(days) or 5
    summary = (
        t(
            locale,
            f"{wet_days} of next {n} days look wet — plan field work around rain",
            f"अगले {n} दिनों में से {wet_days} गीले दिख रहे हैं — खेत के काम बारिश के इर्द-गिर्द योजनाबद्ध करें",
        )
        if wet_days
        else t(
            locale,
            f"Next {n} days look relatively dry for {crop}",
            f"{crop} के लिए अगले {n} दिन अपेक्षाकृत शुष्क दिख रहे हैं",
        )
    )
    return PersonaCard(
        id="farm_forecast",
        title=t(locale, "5-Day Farm Forecast", "5-दिवसीय खेत पूर्वानुमान"),
        summary=summary,
        detail=t(
            locale,
            f"Farm-oriented outlook emphasizing rainfall and temperature for {crop} at {stage}.",
            f"{crop} ({stage}) के लिए वर्षा और तापमान पर केंद्रित खेत-उन्मुख दृष्टिकोण।",
        ),
        recommendation=t(
            locale,
            "Schedule irrigation, spraying, and harvest around the wetter days listed in supporting data.",
            "सहायक डेटा में सूचीबद्ध गीले दिनों के इर्द-गिर्द सिंचाई, छिड़काव और कटाई निर्धारित करें।",
        ),
        supporting_data={"days": lines, "crop": farmer.crop, "crop_stage": farmer.crop_stage},
        provenance="derived",
        source_label=forecast.source if forecast else t(locale, "forecast unavailable", "पूर्वानुमान उपलब्ध नहीं"),
        updated_at=_iso_now(),
        reason=t(
            locale,
            f"Shown because farmers need multi-day rain/temp outlook for {crop} ({stage}).",
            f"यह इसलिए दिखाया जा रहा है क्योंकि किसानों को {crop} ({stage}) के लिए बहु-दिवसीय वर्षा/तापमान दृष्टिकोण चाहिए।",
        ),
        label=t(locale, "Farm forecast emphasis", "खेत पूर्वानुमान ज़ोर"),
        severity="info",
        accent="sky",
    )


def _crop_stage_card(farmer: FarmerProfile, location_name: str, locale: str = "en") -> PersonaCard:
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
    extras = []
    if farmer.irrigation_type:
        extras.append(
            t(locale, f"Irrigation: {farmer.irrigation_type}", f"सिंचाई: {farmer.irrigation_type}")
        )
    if farmer.field_size_ha is not None:
        extras.append(t(locale, f"Field: {farmer.field_size_ha:g} ha", f"खेत: {farmer.field_size_ha:g} हेक्टेयर"))
    if farmer.sowing_date:
        extras.append(t(locale, f"Sown: {farmer.sowing_date}", f"बुवाई: {farmer.sowing_date}"))
    return PersonaCard(
        id="crop_stage",
        title=t(locale, "Crop & Stage", "फसल और अवस्था"),
        summary=f"{crop} · {stage}",
        detail=(
            t(locale, f"Location: {location_name}. ", f"स्थान: {location_name}. ")
            + (
                " · ".join(extras)
                if extras
                else t(locale, "Profile drives advisory context.", "प्रोफ़ाइल सलाह संदर्भ तय करती है।")
            )
        ),
        recommendation=t(
            locale,
            "Update crop/stage in Profile if your field status changes — homepage guidance follows this context.",
            "यदि खेत की स्थिति बदले तो प्रोफ़ाइल में फसल/अवस्था अपडेट करें — होमपेज मार्गदर्शन इसी संदर्भ का अनुसरण करता है।",
        ),
        supporting_data=farmer.model_dump(),
        provenance="derived",
        source_label=t(locale, "Your farm profile", "आपकी खेत प्रोफ़ाइल"),
        updated_at=_iso_now(),
        reason=t(
            locale,
            f"Shown because your Farmer profile sets crop={crop} and stage={stage} for this location.",
            f"यह इसलिए दिखाया जा रहा है क्योंकि आपकी किसान प्रोफ़ाइल इस स्थान के लिए फसल={crop} और अवस्था={stage} तय करती है।",
        ),
        label=t(locale, "Farm profile context", "खेत प्रोफ़ाइल संदर्भ"),
        severity="info",
        accent="emerald",
    )


def _agromet_card(status: AgrometAdvisoryStatus, farmer: FarmerProfile, locale: str = "en") -> PersonaCard:
    crop = _crop(farmer, locale)
    stage = _stage(farmer, locale)
    title = t(locale, "Official IMD Agromet Advisory", "आधिकारिक IMD एग्रोमेट सलाह")
    if status.available and status.advisory_text:
        return PersonaCard(
            id="agromet_advisory",
            title=title,
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
            reason=t(
                locale,
                f"Official IMD Agromet advisory matched for {crop} ({stage}).",
                f"{crop} ({stage}) के लिए आधिकारिक IMD एग्रोमेट सलाह मिली।",
            ),
            label=t(locale, "Official IMD Agromet", "आधिकारिक IMD एग्रोमेट"),
            severity="advisory",
            accent="emerald",
        )
    return PersonaCard(
        id="agromet_advisory",
        title=title,
        summary=t(locale, "Official crop advisory currently unavailable", "आधिकारिक फसल सलाह अभी उपलब्ध नहीं है"),
        detail=status.message,
        recommendation=t(
            locale,
            f"Open the official KALP portal for location + {crop} + {stage} advisories. "
            "MAUSAM still shows weather-derived farm guidance separately and will never label it as IMD Agromet.",
            f"स्थान + {crop} + {stage} सलाह के लिए आधिकारिक KALP पोर्टल खोलें। "
            "MAUSAM मौसम-व्युत्पन्न खेत मार्गदर्शन अलग से दिखाता है और उसे IMD एग्रोमेट के रूप में लेबल नहीं करेगा।",
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
        reason=t(
            locale,
            f"Shown because your profile is Farmer ({crop}, {stage}); we surface an honest "
            "official-advisory status instead of inventing IMD text.",
            f"यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है ({crop}, {stage}); "
            "हम गढ़े हुए IMD पाठ के बजाय ईमानदार आधिकारिक-सलाह स्थिति दिखाते हैं।",
        ),
        label=t(locale, "Official source not connected", "आधिकारिक स्रोत कनेक्ट नहीं"),
        severity="info",
        accent="mist",
    )


async def build_farmer_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    farmer: FarmerProfile,
    locale: str = "en",
) -> PersonaHomePayload:
    agromet = await fetch_official_agromet_advisory(
        weather.location.lat, weather.location.lon, farmer=farmer, locale=locale
    )
    cards = [
        _crop_stage_card(farmer, weather.location.name, locale),
        _agromet_card(agromet, farmer, locale),
        _irrigation_card(weather, forecast, farmer, locale),
        _soil_moisture_card(weather, forecast, farmer, locale),
        *_crop_risk_cards(weather, forecast, farmer, locale),
        _farm_forecast_card(forecast, farmer, locale),
    ]
    return PersonaHomePayload(
        persona="farmer",
        section_order=PERSONA_SECTION_ORDER["farmer"],
        hero_title=t(locale, "Farm Weather", "खेत का मौसम"),
        hero_subtitle=f"{_crop(farmer, locale)} · {_stage(farmer, locale)}",
        metric_priority=PERSONA_METRIC_PRIORITY["farmer"],
        cards=cards,
        agromet=agromet,
        quick_actions=["irrigation", "crop_risk", "farm_forecast", "alerts"],
    )


def _best_run_windows(
    forecast: ForecastResponse | None,
    weather: WeatherResponse,
    locale: str = "en",
) -> PersonaCard:
    hours = (forecast.hourly[:24] if forecast and forecast.hourly else [])
    windows: list[dict] = []
    for h in hours:
        rain = h.precipitation_probability or 0
        uv = h.uv_index if h.uv_index is not None else 0
        score = 100 - rain * 0.7 - max(0, (uv - 5)) * 8
        if weather.current.humidity is not None and weather.current.humidity > 80:
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
        default_summary = t(
            locale,
            "Prefer early morning (6–8 AM) or after sunset",
            "सुबह जल्दी (6–8 बजे) या सूर्यास्त के बाद प्राथमिकता दें",
        )
    else:
        default_summary = t(
            locale,
            "Conditions allow flexible run timing today",
            "आज दौड़ का समय लचीला रखा जा सकता है",
        )
    summary = (
        t(
            locale,
            f"Best windows: {', '.join(w['time'][11:16] for w in windows[:2])}",
            f"सर्वोत्तम समय: {', '.join(w['time'][11:16] for w in windows[:2])}",
        )
        if windows
        else default_summary
    )
    fitness = t(locale, "Fitness recommendation", "फिटनेस सुझाव")
    return PersonaCard(
        id="best_run_time",
        title=t(locale, "Best Time to Run", "दौड़ का सबसे अच्छा समय"),
        summary=summary,
        detail=t(
            locale,
            "Scored from hourly rain probability, UV, and comfort. Severe alerts still override outdoor plans.",
            "प्रति घंटा वर्षा संभावना, UV और आराम से स्कोर किया गया। गंभीर अलर्ट बाहरी योजनाओं को ओवरराइड करते हैं।",
        ),
        recommendation=t(
            locale,
            "Carry water; avoid peak UV if your top windows fall near midday.",
            "पानी साथ रखें; यदि सर्वोत्तम समय दोपहर के पास हो तो चरम UV से बचें।",
        ),
        supporting_data={"windows": windows, "humidity_pct": weather.current.humidity},
        provenance="derived",
        source_label=t(locale, "MAUSAM derived", "MAUSAM व्युत्पन्न"),
        updated_at=_iso_now(),
        reason=t(
            locale,
            "Shown because your profile is Fitness and run timing depends on rain, UV, and heat.",
            "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल फिटनेस है और दौड़ का समय वर्षा, UV तथा गर्मी पर निर्भर करता है।",
        ),
        label=fitness,
        severity="info",
        accent="sky",
    )


def build_runner_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    locale: str = "en",
) -> PersonaHomePayload:
    c = weather.current
    rain = _rain_today(forecast)
    aqi_val = air_quality.us_aqi if air_quality else None
    fitness = t(locale, "Fitness recommendation", "फिटनेस सुझाव")
    mausam = t(locale, "MAUSAM derived", "MAUSAM व्युत्पन्न")
    current_wx = t(locale, "Current weather", "वर्तमान मौसम")
    hum = f"{c.humidity:.0f}%" if c.humidity is not None else "--"
    cards = [
        _best_run_windows(forecast, weather, locale),
        PersonaCard(
            id="heat_humidity",
            title=t(locale, "Heat + Humidity", "गर्मी + नमी"),
            summary=t(
                locale,
                f"{c.temperature:.0f}°C · Humidity {hum} · Feels {c.feels_like:.0f}°C",
                f"{c.temperature:.0f}°C · नमी {hum} · महसूस {c.feels_like:.0f}°C",
            ),
            detail=t(
                locale,
                "Heat stress rises when both temperature and humidity are elevated.",
                "जब तापमान और नमी दोनों ऊँचे हों तो गर्मी का तनाव बढ़ता है।",
            ),
            recommendation=(
                t(
                    locale,
                    "Shorten the run and hydrate more frequently.",
                    "दौड़ छोटी रखें और अधिक बार पानी पिएँ।",
                )
                if c.temperature >= 32 or (c.humidity is not None and c.humidity >= 75)
                else t(
                    locale,
                    "Heat load looks manageable for a normal session.",
                    "सामान्य सत्र के लिए गर्मी का भार प्रबंधनीय लगता है।",
                )
            ),
            supporting_data={"temperature_c": c.temperature, "humidity_pct": c.humidity, "feels_like_c": c.feels_like},
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because Fitness profiles need heat/humidity context for outdoor running.",
                "यह इसलिए दिखाया जा रहा है क्योंकि फिटनेस प्रोफ़ाइल को बाहरी दौड़ के लिए गर्मी/नमी संदर्भ चाहिए।",
            ),
            label=fitness,
            severity="advisory" if c.temperature >= 35 else "info",
        ),
        PersonaCard(
            id="aqi",
            title="AQI / PM2.5",
            summary=(
                f"AQI {aqi_val} ({aqi_category_label(air_quality.category, locale)}) · PM2.5 {air_quality.pm2_5:.0f}"
                if air_quality and aqi_val is not None and air_quality.pm2_5 is not None
                else (
                    f"AQI {aqi_val} ({aqi_category_label(air_quality.category, locale)})"
                    if air_quality and aqi_val is not None
                    else t(locale, "AQI unavailable", "AQI उपलब्ध नहीं")
                )
            ),
            detail=t(
                locale,
                "Outdoor fitness is sensitive to air quality, especially for longer runs.",
                "बाहरी फिटनेस वायु गुणवत्ता के प्रति संवेदनशील है, खासकर लंबी दौड़ में।",
            ),
            recommendation=(
                t(
                    locale,
                    "Consider an indoor workout if AQI is unhealthy.",
                    "यदि AQI अस्वस्थ है तो इनडोर व्यायाम पर विचार करें।",
                )
                if aqi_val is not None and aqi_val >= 150
                else t(
                    locale,
                    "Air quality looks acceptable for outdoor exercise.",
                    "बाहरी व्यायाम के लिए वायु गुणवत्ता स्वीकार्य लगती है।",
                )
            ),
            supporting_data={
                "us_aqi": aqi_val,
                "pm2_5": air_quality.pm2_5 if air_quality else None,
                "category": air_quality.category if air_quality else None,
                "source": air_quality.source if air_quality else None,
            },
            provenance="derived",
            source_label=air_quality.source if air_quality else t(locale, "unavailable", "उपलब्ध नहीं"),
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because your profile is Fitness and AQI affects outdoor running safety.",
                "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल फिटनेस है और AQI बाहरी दौड़ सुरक्षा प्रभावित करता है।",
            ),
            label=t(locale, "Air quality for running", "दौड़ के लिए वायु गुणवत्ता"),
            severity="warning" if aqi_val and aqi_val >= 150 else "info",
        ),
        PersonaCard(
            id="uv",
            title=t(locale, "UV Index", "UV सूचकांक"),
            summary=(
                f"UV {c.uv_index:.0f}"
                if c.uv_index is not None
                else t(locale, "UV unavailable", "UV उपलब्ध नहीं")
            ),
            detail=t(
                locale,
                "High UV increases sun exposure during daytime runs.",
                "ऊँचा UV दिन की दौड़ में सूर्य संपर्क बढ़ाता है।",
            ),
            recommendation=t(
                locale,
                "Use sunscreen and prefer shade/early hours when UV is high.",
                "UV ऊँचा होने पर सनस्क्रीन लगाएँ और छाया/सुबह के घंटे प्राथमिकता दें।",
            ),
            supporting_data={"uv_index": c.uv_index},
            provenance="derived",
            source_label=current_wx,
            updated_at=c.observed_at,
            reason=t(
                locale,
                "Shown because UV exposure matters for daytime outdoor fitness.",
                "यह इसलिए दिखाया जा रहा है क्योंकि दिन की बाहरी फिटनेस में UV संपर्क मायने रखता है।",
            ),
            label=fitness,
            severity="advisory" if (c.uv_index or 0) >= 7 else "info",
        ),
        PersonaCard(
            id="rain",
            title=t(locale, "Rain Probability", "बारिश की संभावना"),
            summary=t(
                locale,
                f"{rain:.0f}% chance of rain today",
                f"आज बारिश की संभावना {rain:.0f}%",
            ),
            detail=t(
                locale,
                "Rain affects trail safety and clothing choices.",
                "बारिश पगडंडी सुरक्षा और कपड़ों के चयन को प्रभावित करती है।",
            ),
            recommendation=t(
                locale,
                "Carry a light shell if rain exceeds 40%.",
                "यदि बारिश 40% से अधिक हो तो हल्का जैकेट साथ रखें।",
            ),
            supporting_data={"rain_probability_pct": round(rain)},
            provenance="derived",
            source_label=forecast.source if forecast else t(locale, "forecast", "पूर्वानुमान"),
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because rain probability shapes outdoor running plans.",
                "यह इसलिए दिखाया जा रहा है क्योंकि वर्षा संभावना बाहरी दौड़ योजना तय करती है।",
            ),
            label=fitness,
            severity="watch" if rain >= 50 else "info",
        ),
        PersonaCard(
            id="wind",
            title=t(locale, "Wind", "हवा"),
            summary=(
                f"{c.wind_speed:.0f} km/h"
                if c.wind_speed is not None
                else t(locale, "Wind unavailable", "हवा उपलब्ध नहीं")
            ),
            detail=t(
                locale,
                "Strong headwinds increase effort; gusts affect safety on exposed routes.",
                "तेज़ विपरीत हवाएँ प्रयास बढ़ाती हैं; झोंके खुले मार्गों पर सुरक्षा प्रभावित करते हैं।",
            ),
            recommendation=t(
                locale,
                "Choose sheltered routes if winds exceed ~30 km/h.",
                "यदि हवा ~30 km/h से अधिक हो तो सुरक्षित मार्ग चुनें।",
            ),
            supporting_data={"wind_kmh": c.wind_speed, "wind_direction": c.wind_direction},
            provenance="derived",
            source_label=current_wx,
            updated_at=c.observed_at,
            reason=t(
                locale,
                "Shown because wind affects running effort and comfort.",
                "यह इसलिए दिखाया जा रहा है क्योंकि हवा दौड़ प्रयास और आराम को प्रभावित करती है।",
            ),
            label=fitness,
            severity="watch" if c.wind_speed is not None and c.wind_speed >= 30 else "info",
        ),
        PersonaCard(
            id="hydration",
            title=t(locale, "Hydration / Clothing", "हाइड्रेशन / कपड़े"),
            summary=(
                t(locale, "Light clothing + extra water", "हल्के कपड़े + अतिरिक्त पानी")
                if c.temperature >= 30
                else (
                    t(locale, "Layer up", "परतदार कपड़े पहनें")
                    if c.temperature <= 15
                    else t(locale, "Standard running kit", "सामान्य दौड़ किट")
                )
            ),
            detail=t(
                locale,
                "Derived from temperature, humidity, and rain chance.",
                "तापमान, नमी और वर्षा संभावना से व्युत्पन्न।",
            ),
            recommendation=t(
                locale,
                f"Temperature {c.temperature:.0f}°C, humidity "
                f"{f'{c.humidity:.0f}%' if c.humidity is not None else 'unavailable'}, rain {rain:.0f}%.",
                f"तापमान {c.temperature:.0f}°C, नमी "
                f"{f'{c.humidity:.0f}%' if c.humidity is not None else 'उपलब्ध नहीं'}, वर्षा {rain:.0f}%.",
            ),
            supporting_data={"temperature_c": c.temperature, "humidity_pct": c.humidity, "rain_probability_pct": round(rain)},
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because Fitness profiles need clothing/hydration cues from live weather.",
                "यह इसलिए दिखाया जा रहा है क्योंकि फिटनेस प्रोफ़ाइल को लाइव मौसम से कपड़े/हाइड्रेशन संकेत चाहिए।",
            ),
            label=fitness,
            severity="info",
        ),
        PersonaCard(
            id="hourly_run",
            title=t(locale, "Hourly Running Conditions", "प्रति घंटा दौड़ स्थितियाँ"),
            summary=t(
                locale,
                "Next hours scored for rain and UV",
                "अगले घंटे वर्षा और UV के लिए स्कोर किए गए",
            ),
            detail=t(
                locale,
                "Use Best Time to Run for top windows; hourly chart remains below for detail.",
                "सर्वोत्तम समय के लिए Best Time to Run देखें; विस्तार के लिए प्रति घंटा चार्ट नीचे है।",
            ),
            recommendation=t(
                locale,
                "Tap expand for the same supporting hourly shortlist used in Best Time to Run.",
                "Best Time to Run में प्रयुक्त समान प्रति घंटा सूची के लिए विस्तार टैप करें।",
            ),
            supporting_data={"note": "See best_run_time windows"},
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because runners plan around hourly condition changes.",
                "यह इसलिए दिखाया जा रहा है क्योंकि धावक प्रति घंटा स्थिति बदलाव के अनुसार योजना बनाते हैं।",
            ),
            label=fitness,
            severity="info",
        ),
    ]
    return PersonaHomePayload(
        persona="runner",
        section_order=PERSONA_SECTION_ORDER["runner"],
        hero_title=t(locale, "Fitness Weather", "फिटनेस मौसम"),
        hero_subtitle=t(
            locale,
            "Run-ready conditions for your location",
            "आपके स्थान के लिए दौड़-उपयुक्त स्थितियाँ",
        ),
        metric_priority=PERSONA_METRIC_PRIORITY["runner"],
        cards=cards,
        quick_actions=["best_run_time", "aqi", "uv", "alerts"],
    )


def build_traveller_payload(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    locale: str = "en",
) -> PersonaHomePayload:
    c = weather.current
    rain = _rain_today(forecast)
    vis = c.visibility
    stormy = c.condition_group in ("storm", "rain") or rain >= 60
    travel = t(locale, "Travel recommendation", "यात्रा सुझाव")
    mausam = t(locale, "MAUSAM derived", "MAUSAM व्युत्पन्न")
    current_wx = t(locale, "Current weather", "वर्तमान मौसम")
    risk_bits = []
    if stormy:
        risk_bits.append(t(locale, "rain/storm", "बारिश/तूफान"))
    if vis is not None and vis < 3:
        risk_bits.append(t(locale, "low visibility", "कम दृश्यता"))
    if c.wind_speed is not None and c.wind_speed >= 35:
        risk_bits.append(t(locale, "strong wind", "तेज़ हवा"))
    risk_summary = (
        t(locale, "Elevated travel caution: ", "यात्रा में अतिरिक्त सावधानी: ") + ", ".join(risk_bits)
        if risk_bits
        else t(locale, "Travel conditions look manageable", "यात्रा स्थितियाँ प्रबंधनीय दिख रही हैं")
    )
    packing = []
    if rain >= 40 or c.condition_group in ("rain", "drizzle", "storm"):
        packing.append(t(locale, "compact umbrella / raincoat", "छोटा छाता / रेनकोट"))
    if c.temperature >= 30:
        packing.append(t(locale, "light clothing + sunscreen", "हल्के कपड़े + सनस्क्रीन"))
    if c.temperature <= 15:
        packing.append(t(locale, "warm layer", "गर्म परत"))
    if not packing:
        packing.append(t(locale, "light everyday kit", "हल्का दैनिक सामान"))

    cards = [
        PersonaCard(
            id="travel_risk",
            title=t(locale, "Travel Risk", "यात्रा जोखिम"),
            summary=risk_summary,
            detail=t(
                locale,
                "Combines rain/thunderstorm likelihood, visibility, and wind.",
                "वर्षा/आंधी संभावना, दृश्यता और हवा को मिलाता है।",
            ),
            recommendation=t(
                locale,
                "Allow extra time if rain or low visibility is flagged.",
                "यदि बारिश या कम दृश्यता हो तो अतिरिक्त समय रखें।",
            ),
            supporting_data={
                "rain_probability_pct": round(rain),
                "visibility_km": vis,
                "wind_kmh": c.wind_speed,
                "condition_group": c.condition_group,
            },
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because your profile is Traveller and visibility/rain/wind may affect travel.",
                "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल यात्री है और दृश्यता/वर्षा/हवा यात्रा प्रभावित कर सकती है।",
            ),
            label=travel,
            severity="advisory" if risk_bits else "info",
            accent="amber",
        ),
        PersonaCard(
            id="rain",
            title=t(locale, "Rain / Thunderstorm", "बारिश / आंधी-तूफान"),
            summary=t(
                locale,
                f"{rain:.0f}% rain chance · {c.condition}",
                f"वर्षा संभावना {rain:.0f}% · {weather_condition_label(c.condition, locale)}",
            ),
            detail=t(
                locale,
                "Stormy conditions slow road travel and outdoor connections.",
                "तूफ़ानी स्थितियाँ सड़क यात्रा और बाहरी कनेक्शन धीमे करती हैं।",
            ),
            recommendation=t(
                locale,
                "Keep waterproof cover handy if rain chance is material.",
                "यदि वर्षा संभावना महत्वपूर्ण हो तो जलरोधक आवरण साथ रखें।",
            ),
            supporting_data={"rain_probability_pct": round(rain), "condition": c.condition},
            provenance="derived",
            source_label=forecast.source if forecast else t(locale, "weather", "मौसम"),
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because rain/thunderstorm risk is a primary travel concern.",
                "यह इसलिए दिखाया जा रहा है क्योंकि वर्षा/आंधी जोखिम यात्रा की प्रमुख चिंता है।",
            ),
            label=travel,
            severity="watch" if rain >= 50 else "info",
        ),
        PersonaCard(
            id="visibility",
            title=t(locale, "Visibility", "दृश्यता"),
            summary=(
                f"{vis:.1f} km"
                if vis is not None
                else t(locale, "Visibility unavailable", "दृश्यता उपलब्ध नहीं")
            ),
            detail=t(
                locale,
                "Fog and haze reduce safe driving speeds.",
                "कोहरा और धुंध सुरक्षित ड्राइविंग गति कम करते हैं।",
            ),
            recommendation=t(
                locale,
                "Use fog lights and reduce speed if visibility drops below 3 km.",
                "यदि दृश्यता 3 km से कम हो तो फॉग लाइट्स इस्तेमाल करें और गति कम करें।",
            ),
            supporting_data={"visibility_km": vis},
            provenance="derived",
            source_label=current_wx,
            updated_at=c.observed_at,
            reason=t(
                locale,
                "Shown because Traveller profiles prioritize road visibility.",
                "यह इसलिए दिखाया जा रहा है क्योंकि यात्री प्रोफ़ाइल सड़क दृश्यता को प्राथमिकता देती है।",
            ),
            label=travel,
            severity="advisory" if vis is not None and vis < 3 else "info",
        ),
        PersonaCard(
            id="wind",
            title=t(locale, "Wind", "हवा"),
            summary=(
                f"{c.wind_speed:.0f} km/h"
                if c.wind_speed is not None
                else t(locale, "Wind unavailable", "हवा उपलब्ध नहीं")
            ),
            detail=t(
                locale,
                "High winds affect two-wheelers, high-sided vehicles, and outdoor waits.",
                "तेज़ हवाएँ दोपहिया, ऊँचे वाहनों और बाहरी प्रतीक्षा को प्रभावित करती हैं।",
            ),
            recommendation=t(
                locale,
                "Secure loose items; prefer covered transit waits in strong wind.",
                "ढीली वस्तुओं को सुरक्षित करें; तेज़ हवा में ढकी प्रतीक्षा प्राथमिकता दें।",
            ),
            supporting_data={"wind_kmh": c.wind_speed},
            provenance="derived",
            source_label=current_wx,
            updated_at=c.observed_at,
            reason=t(
                locale,
                "Shown because wind can disrupt travel comfort and safety.",
                "यह इसलिए दिखाया जा रहा है क्योंकि हवा यात्रा आराम और सुरक्षा बाधित कर सकती है।",
            ),
            label=travel,
            severity="watch" if c.wind_speed is not None and c.wind_speed >= 35 else "info",
        ),
        PersonaCard(
            id="temperature",
            title=t(locale, "Temperature", "तापमान"),
            summary=t(
                locale,
                f"{c.temperature:.0f}°C (feels {c.feels_like:.0f}°C)",
                f"{c.temperature:.0f}°C (महसूस {c.feels_like:.0f}°C)",
            ),
            detail=t(
                locale,
                "Packing and wait-time comfort depend on temperature.",
                "सामान पैकिंग और प्रतीक्षा आराम तापमान पर निर्भर करते हैं।",
            ),
            recommendation=t(
                locale,
                "Dress for feels-like temperature during outdoor transfers.",
                "बाहरी स्थानांतरण के दौरान महसूस तापमान के अनुसार कपड़े पहनें।",
            ),
            supporting_data={"temperature_c": c.temperature, "feels_like_c": c.feels_like},
            provenance="derived",
            source_label=current_wx,
            updated_at=c.observed_at,
            reason=t(
                locale,
                "Shown because Traveller profiles need temperature for packing and comfort.",
                "यह इसलिए दिखाया जा रहा है क्योंकि यात्री प्रोफ़ाइल को पैकिंग और आराम के लिए तापमान चाहिए।",
            ),
            label=travel,
            severity="info",
        ),
        PersonaCard(
            id="hourly_travel",
            title=t(locale, "Hourly Travel Outlook", "प्रति घंटा यात्रा पूर्वानुमान"),
            summary=t(
                locale,
                "Watch the next hours for rain and visibility changes",
                "अगले घंटों में वर्षा और दृश्यता बदलाव पर नज़र रखें",
            ),
            detail=t(
                locale,
                "Use the hourly forecast section for full timeline; this card highlights travel relevance.",
                "पूर्ण समयरेखा के लिए प्रति घंटा पूर्वानुमान अनुभाग देखें; यह कार्ड यात्रा प्रासंगिकता दर्शाता है।",
            ),
            recommendation=t(
                locale,
                "Shift outdoor transfers away from peak rain hours when possible.",
                "संभव हो तो बाहरी स्थानांतरण चरम वर्षा घंटों से दूर रखें।",
            ),
            supporting_data={"rain_probability_pct": round(rain)},
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because travellers plan around hourly weather shifts.",
                "यह इसलिए दिखाया जा रहा है क्योंकि यात्री प्रति घंटा मौसम बदलाव के अनुसार योजना बनाते हैं।",
            ),
            label=travel,
            severity="info",
        ),
        PersonaCard(
            id="packing",
            title=t(locale, "Packing Suggestion", "सामान पैक करने का सुझाव"),
            summary=", ".join(packing),
            detail=t(
                locale,
                "Derived from current conditions and today's rain probability at this location.",
                "इस स्थान की वर्तमान स्थितियों और आज की वर्षा संभावना से व्युत्पन्न।",
            ),
            recommendation=t(
                locale,
                "Adjust if your destination differs from the selected location.",
                "यदि गंतव्य चयनित स्थान से भिन्न हो तो समायोजित करें।",
            ),
            supporting_data={"items": packing, "rain_probability_pct": round(rain)},
            provenance="derived",
            source_label=mausam,
            updated_at=_iso_now(),
            reason=t(
                locale,
                "Shown because your profile is Traveller and packing depends on rain and temperature.",
                "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल यात्री है और पैकिंग वर्षा तथा तापमान पर निर्भर करती है।",
            ),
            label=travel,
            severity="info",
            accent="sky",
        ),
    ]
    return PersonaHomePayload(
        persona="traveller",
        section_order=PERSONA_SECTION_ORDER["traveller"],
        hero_title=t(locale, "Travel Weather", "यात्रा मौसम"),
        hero_subtitle=t(
            locale,
            "Risk, visibility, and packing for the road",
            "सड़क के लिए जोखिम, दृश्यता और पैकिंग",
        ),
        metric_priority=PERSONA_METRIC_PRIORITY["traveller"],
        cards=cards,
        quick_actions=["travel_risk", "visibility", "packing", "alerts"],
    )


def build_stub_payload(persona: PersonaId, locale: str = "en") -> PersonaHomePayload:
    """Architecture-ready stubs for personas not fully specialized yet."""
    titles = {
        "marine": (
            t(locale, "Marine Weather", "समुद्री मौसम"),
            t(
                locale,
                "Waves, wind, and coastal safety — specialized marine APIs expand here",
                "लहरें, हवा और तटीय सुरक्षा — विशेष समुद्री API यहाँ विस्तारित होते हैं",
            ),
        ),
        "family": (
            t(locale, "Family Weather", "पारिवारिक मौसम"),
            t(
                locale,
                "School commute and outdoor family plans",
                "स्कूल आवागमन और बाहरी पारिवारिक योजनाएँ",
            ),
        ),
        "health_vulnerable": (
            t(locale, "Health Weather", "स्वास्थ्य मौसम"),
            t(
                locale,
                "AQI, heat, and comfort for vulnerable users",
                "संवेदनशील उपयोगकर्ताओं के लिए AQI, गर्मी और आराम",
            ),
        ),
        "disaster": (
            t(locale, "Emergency Weather", "आपातकालीन मौसम"),
            t(
                locale,
                "Warnings-first layout for disaster readiness",
                "आपदा तैयारी के लिए चेतावनी-प्रथम लेआउट",
            ),
        ),
    }
    title, subtitle = titles.get(
        persona,
        (
            t(locale, "Weather", "मौसम"),
            t(locale, "Personalized homepage", "व्यक्तिगत होमपेज"),
        ),
    )
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
    locale: str = "en",
) -> PersonaHomePayload:
    persona = resolve_persona(interests, profile)
    if persona == "farmer":
        farmer = (profile.farmer if profile and profile.farmer else None) or FarmerProfile()
        return await build_farmer_payload(weather, forecast, farmer, locale)
    if persona == "runner":
        return build_runner_payload(weather, forecast, air_quality, locale)
    if persona == "traveller":
        return build_traveller_payload(weather, forecast, locale)
    return build_stub_payload(persona, locale)
