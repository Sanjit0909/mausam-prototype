/**
 * Presentation-layer localization for persona homepage cards.
 * Does not mutate backend/IMD payloads.
 */

const EXACT: Record<string, string> = {
  "Farm Weather": "खेत का मौसम",
  "Fitness Weather": "फिटनेस मौसम",
  "Travel Weather": "यात्रा मौसम",
  "Crop & Stage": "फसल और अवस्था",
  "Official IMD Agromet Advisory": "आधिकारिक IMD एग्रोमेट सलाह",
  "Official crop advisory currently unavailable":
    "आधिकारिक फसल सलाह अभी उपलब्ध नहीं है",
  "Official crop advisory unavailable in this app right now":
    "इस ऐप में आधिकारिक फसल सलाह अभी उपलब्ध नहीं है",
  "MAUSAM estimate (not IMD observation)": "MAUSAM अनुमान (IMD अवलोकन नहीं)",
  "MAUSAM derived (not IMD advisory)": "MAUSAM व्युत्पन्न (IMD सलाह नहीं)",
  "Your farm profile": "आपकी खेत प्रोफ़ाइल",
  "IMD Agromet (not connected)": "IMD एग्रोमेट (कनेक्ट नहीं)",
  "crop": "फसल",
  "crop stage": "फसल अवस्था",
  "rain probability pct": "वर्षा संभावना %",
  "humidity pct": "नमी %",
  "temperature c": "तापमान °C",
  "wind kmh": "हवा km/h",
  "visibility km": "दृश्यता km",
  "status": "स्थिति",
  "unavailable": "उपलब्ध नहीं",
  "Rainfall & Irrigation Decision": "वर्षा और सिंचाई निर्णय",
  "Soil Moisture Status — Estimated": "मिट्टी की नमी — अनुमानित",
  "Weather-based estimate": "मौसम-आधारित अनुमान",
  "5-Day Farm Forecast": "5-दिवसीय खेत पूर्वानुमान",
  "Best Time to Run": "दौड़ का सबसे अच्छा समय",
  "Heat + Humidity": "गर्मी + नमी",
  "AQI / PM2.5": "AQI / PM2.5",
  "UV Index": "UV सूचकांक",
  "Rain Probability": "बारिश की संभावना",
  Wind: "हवा",
  "Hydration / Clothing": "हाइड्रेशन / कपड़े",
  "Hourly Running Conditions": "प्रति घंटा दौड़ स्थितियाँ",
  "Travel Risk": "यात्रा जोखिम",
  "Rain / Thunderstorm": "बारिश / आंधी-तूफान",
  Visibility: "दृश्यता",
  Temperature: "तापमान",
  "Hourly Travel Outlook": "प्रति घंटा यात्रा पूर्वानुमान",
  "Packing Suggestion": "सामान पैक करने का सुझाव",
  "Crop Weather Risk": "फसल मौसम जोखिम",
  "Crop Stress: Heavy Rain Risk": "फसल तनाव: भारी वर्षा जोखिम",
  "Crop Stress: Heat": "फसल तनाव: गर्मी",
  "Crop Stress: High Humidity": "फसल तनाव: उच्च नमी",
  "Crop Stress: Strong Wind": "फसल तनाव: तेज़ हवा",
  "Crop Stress: Cold / Frost Risk": "फसल तनाव: ठंड / पाला जोखिम",
  "Travel conditions look manageable": "यात्रा स्थितियाँ प्रबंधनीय दिख रही हैं",
  "Standard running kit": "सामान्य दौड़ किट",
  "Light clothing + extra water": "हल्के कपड़े + अतिरिक्त पानी",
  "Layer up": "परतदार कपड़े पहनें",
};

const PHRASES: Array<[RegExp, string]> = [
  [/Shown because your profile is Farmer/gi, "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल किसान है"],
  [/Shown because your profile is Fitness/gi, "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल फिटनेस है"],
  [/Shown because your profile is Traveller/gi, "यह इसलिए दिखाया जा रहा है क्योंकि आपकी प्रोफ़ाइल यात्री है"],
  [/and rainfall is relevant to irrigation planning/gi, "और सिंचाई योजना के लिए वर्षा प्रासंगिक है"],
  [/Rain likely/gi, "बारिश की संभावना"],
  [/irrigation may be deferred/gi, "सिंचाई टाली जा सकती है"],
  [/irrigation may be needed/gi, "सिंचाई की आवश्यकता हो सकती है"],
  [/Official crop advisory currently unavailable/gi, "आधिकारिक फसल सलाह अभी उपलब्ध नहीं है"],
  [/Open the official KALP portal/gi, "आधिकारिक KALP पोर्टल खोलें"],
  [/never label it as IMD Agromet/gi, "इसे IMD एग्रोमेट के रूप में लेबल नहीं करेगा"],
  [/weather-based estimate/gi, "मौसम-आधारित अनुमान"],
  [/Likely dry/gi, "संभावित रूप से सूखी"],
  [/Adequate to high/gi, "पर्याप्त से अधिक"],
  [/Moderate/gi, "मध्यम"],
  [/Official IMD/gi, "आधिकारिक IMD"],
  [/not an official/gi, "आधिकारिक नहीं"],
  [/MAUSAM derived/gi, "MAUSAM व्युत्पन्न"],
  [/Wheat/g, "गेहूँ"],
  [/Rice/g, "चावल"],
  [/Cotton/g, "कपास"],
  [/Sugarcane/g, "गन्ना"],
  [/Maize/g, "मक्का"],
  [/Pulses/g, "दालें"],
  [/Vegetative/g, "वृद्धिशील"],
  [/Flowering/g, "फूल आने की अवस्था"],
  [/Sowing/g, "बुवाई"],
  [/Harvest/g, "कटाई"],
  [/Fruiting \/ Grain filling/g, "फलन / दाना भरना"],
];

export function localizePersonaCardText(text: string, locale: string): string {
  if (!text || locale !== "hi") return text;
  const exact = EXACT[text.trim()];
  if (exact) return exact;
  let out = text;
  for (const [re, hi] of PHRASES) {
    out = out.replace(re, hi);
  }
  return out;
}
