"""Bilingual helpers for deterministic persona / Agromet user-facing copy.

Provider names (IMD, KALP, Meghdoot, Open-Meteo, …) and units stay as-is.
"""
from __future__ import annotations

CROP_EN = {
    "wheat": "Wheat",
    "rice": "Rice",
    "cotton": "Cotton",
    "sugarcane": "Sugarcane",
    "maize": "Maize",
    "pulses": "Pulses",
    "other": "Crop",
}
CROP_HI = {
    "wheat": "गेहूँ",
    "rice": "चावल",
    "cotton": "कपास",
    "sugarcane": "गन्ना",
    "maize": "मक्का",
    "pulses": "दालें",
    "other": "फसल",
}
STAGE_EN = {
    "sowing": "Sowing",
    "vegetative": "Vegetative",
    "flowering": "Flowering",
    "fruiting": "Fruiting / Grain filling",
    "harvest": "Harvest",
}
STAGE_HI = {
    "sowing": "बुवाई",
    "vegetative": "वृद्धिशील",
    "flowering": "फूल आने की अवस्था",
    "fruiting": "फलन / दाना भरना",
    "harvest": "कटाई",
}

SOIL_EN = {
    "Adequate to high": "Adequate to high",
    "Moderate": "Moderate",
    "Likely dry": "Likely dry",
    "Fair": "Fair",
}
SOIL_HI = {
    "Adequate to high": "पर्याप्त से अधिक",
    "Moderate": "मध्यम",
    "Likely dry": "संभावित रूप से सूखी",
    "Fair": "सामान्य",
}


def is_hi(locale: str | None) -> bool:
    return (locale or "en").strip().lower().startswith("hi")


def t(locale: str | None, en: str, hi: str) -> str:
    return hi if is_hi(locale) else en


def crop_label(crop: str, locale: str | None = "en") -> str:
    key = (crop or "other").lower()
    table = CROP_HI if is_hi(locale) else CROP_EN
    return table.get(key, crop.title() if crop else t(locale, "Crop", "फसल"))


def stage_label(stage: str, locale: str | None = "en") -> str:
    key = (stage or "").lower().replace(" ", "_")
    table = STAGE_HI if is_hi(locale) else STAGE_EN
    return table.get(key, stage.replace("_", " ").title() if stage else "")


def soil_level_label(level: str, locale: str | None = "en") -> str:
    if is_hi(locale):
        return SOIL_HI.get(level, level)
    return SOIL_EN.get(level, level)


AQI_CATEGORY_HI = {
    "Good": "अच्छा",
    "Moderate": "मध्यम",
    "Unhealthy for Sensitive Groups": "संवेदनशील समूहों के लिए अस्वस्थ",
    "Unhealthy": "अस्वस्थ",
    "Very Unhealthy": "बहुत अस्वस्थ",
    "Hazardous": "खतरनाक",
    "Unknown": "अज्ञात",
}

CONDITION_HI = {
    "Clear sky": "साफ आसमान",
    "Clear": "साफ",
    "Sunny": "धूप",
    "Partly cloudy": "आंशिक बादल",
    "Cloudy": "बादल",
    "Overcast": "घने बादल",
    "Fog": "कोहरा",
    "Mist": "धुंध",
    "Haze": "धुंधलापन",
    "Light drizzle": "हल्की बूंदाबांदी",
    "Drizzle": "बूंदाबांदी",
    "Moderate drizzle": "मध्यम बूंदाबांदी",
    "Heavy drizzle": "तेज़ बूंदाबांदी",
    "Light rain": "हल्की बारिश",
    "Rain": "बारिश",
    "Moderate rain": "मध्यम बारिश",
    "Heavy rain": "तेज़ बारिश",
    "Showers": "बौछारें",
    "Thunderstorm": "आंधी-तूफान",
    "Snow": "बर्फ",
    "Unknown": "अज्ञात",
}


def aqi_category_label(category: str | None, locale: str | None = "en") -> str:
    if not category:
        return ""
    if is_hi(locale):
        return AQI_CATEGORY_HI.get(category, category)
    return category


def weather_condition_label(condition: str | None, locale: str | None = "en") -> str:
    if not condition:
        return ""
    if not is_hi(locale):
        return condition
    exact = CONDITION_HI.get(condition)
    if exact:
        return exact
    lower = condition.strip().lower()
    for en, hi in CONDITION_HI.items():
        if en.lower() == lower:
            return hi
    return condition


def agromet_unavailable_message(locale: str | None, *, configured_creds: bool) -> str:
    if not configured_creds:
        return t(
            locale,
            "IMD credentials are not fully configured for Agromet crop advisories. "
            "Use the official KALP portal for crop-stage advisories. "
            "MAUSAM weather-based farm cards below are derived, not official IMD advisories.",
            "IMD Agromet फसल सलाह के लिए क्रेडेंशियल पूरी तरह कॉन्फ़िगर नहीं हैं। "
            "फसल अवस्था सलाह के लिए आधिकारिक KALP पोर्टल का उपयोग करें। "
            "नीचे दिए गए MAUSAM खेत कार्ड मौसम से व्युत्पन्न हैं, आधिकारिक IMD सलाह नहीं।",
        )
    return t(
        locale,
        "Official IMD Meghdoot/KALP crop advisory API is not wired into this deployment. "
        "District weather warnings from IMD remain available separately. "
        "Farm cards below are MAUSAM-derived from live weather and are not labelled as IMD advisories.",
        "इस तैनाती में आधिकारिक IMD Meghdoot/KALP फसल सलाह API जुड़ा नहीं है। "
        "IMD की जिला मौसम चेतावनियाँ अलग से उपलब्ध रहती हैं। "
        "नीचे दिए गए खेत कार्ड लाइव मौसम से MAUSAM द्वारा व्युत्पन्न हैं और IMD सलाह के रूप में चिह्नित नहीं हैं।",
    )
