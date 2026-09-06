/**
 * Presentation-layer localization for weather condition, AQI category, and moon phase.
 * Does not mutate raw provider payloads — only display strings.
 */

const CONDITIONS: Record<string, string> = {
  "Clear sky": "साफ आसमान",
  Clear: "साफ",
  Sunny: "धूप",
  "Partly cloudy": "आंशिक बादल",
  Cloudy: "बादल",
  Overcast: "घने बादल",
  Fog: "कोहरा",
  Mist: "धुंध",
  Haze: "धुंधलापन",
  "Light drizzle": "हल्की बूंदाबांदी",
  Drizzle: "बूंदाबांदी",
  "Moderate drizzle": "मध्यम बूंदाबांदी",
  "Heavy drizzle": "तेज़ बूंदाबांदी",
  "Light rain": "हल्की बारिश",
  Rain: "बारिश",
  "Moderate rain": "मध्यम बारिश",
  "Heavy rain": "तेज़ बारिश",
  Showers: "बौछारें",
  Thunderstorm: "आंधी-तूफान",
  Snow: "बर्फ",
  Unknown: "अज्ञात",
  "Clouds dissolving": "बादल छँट रहे हैं",
  "Sky unchanged": "आसमान अपरिवर्तित",
  "Clouds developing": "बादल बढ़ रहे हैं",
  "Smoke reducing visibility": "धुएँ से दृश्यता कम",
  "Reduced visibility": "दृश्यता कम",
  Precipitation: "वर्षा",
};

const AQI: Record<string, string> = {
  Good: "अच्छा",
  Moderate: "मध्यम",
  "Unhealthy for Sensitive Groups": "संवेदनशील समूहों के लिए अस्वस्थ",
  Unhealthy: "अस्वस्थ",
  "Very Unhealthy": "बहुत अस्वस्थ",
  Hazardous: "खतरनाक",
  Unknown: "अज्ञात",
};

const MOON: Record<string, string> = {
  "New Moon": "अमावस्या",
  "Waxing Crescent": "शुक्ल पक्ष अर्धचंद्र",
  "First Quarter": "शुक्ल पक्ष चतुर्थांश",
  "Waxing Gibbous": "शुक्ल पक्ष गिबस",
  "Full Moon": "पूर्णिमा",
  "Waning Gibbous": "कृष्ण पक्ष गिबस",
  "Last Quarter": "कृष्ण पक्ष चतुर्थांश",
  "Waning Crescent": "कृष्ण पक्ष अर्धचंद्र",
};

function mapLookup(table: Record<string, string>, text: string): string {
  const exact = table[text.trim()];
  if (exact) return exact;
  const lower = text.trim().toLowerCase();
  for (const [en, hi] of Object.entries(table)) {
    if (en.toLowerCase() === lower) return hi;
  }
  return text;
}

export function localizeWeatherCondition(condition: string, locale: string): string {
  if (!condition || locale !== "hi") return condition;
  return mapLookup(CONDITIONS, condition);
}

export function localizeAqiCategory(category: string, locale: string): string {
  if (!category || locale !== "hi") return category;
  return mapLookup(AQI, category);
}

export function localizeMoonPhase(phase: string, locale: string): string {
  if (!phase || locale !== "hi") return phase;
  return mapLookup(MOON, phase);
}
