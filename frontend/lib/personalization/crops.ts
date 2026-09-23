/**
 * Agronomic Knowledge Base & Decision Support Rules for Indian Agriculture.
 * Grounded in ICAR (Indian Council of Agricultural Research) & IMD Agromet guidelines.
 */

export const CROP_OPTIONS = [
  { value: "wheat", labelKey: "crop.wheat", defaultLabel: "Wheat (गेहूं)" },
  { value: "rice", labelKey: "crop.rice", defaultLabel: "Paddy / Rice (धान)" },
  { value: "cotton", labelKey: "crop.cotton", defaultLabel: "Cotton (कपास)" },
  { value: "mustard", labelKey: "crop.mustard", defaultLabel: "Mustard (सरसों)" },
  { value: "sugarcane", labelKey: "crop.sugarcane", defaultLabel: "Sugarcane (गन्ना)" },
  { value: "maize", labelKey: "crop.maize", defaultLabel: "Maize (मक्का)" },
  { value: "pulses", labelKey: "crop.pulses", defaultLabel: "Pulses (दालें/चना)" },
  { value: "other", labelKey: "crop.other", defaultLabel: "Other Crop (अन्य)" },
] as const;

export const CROP_STAGE_OPTIONS = [
  { value: "sowing", labelKey: "crop.stage.sowing", defaultLabel: "Sowing / Germination (बुवाई / अंकुरण)" },
  { value: "vegetative", labelKey: "crop.stage.vegetative", defaultLabel: "Vegetative Growth (वानस्पतिक वृद्धि)" },
  { value: "flowering", labelKey: "crop.stage.flowering", defaultLabel: "Flowering / Pollination (फूल आना / परागण)" },
  { value: "fruiting", labelKey: "crop.stage.fruiting", defaultLabel: "Grain Filling / Pod Formation (दाना भरना)" },
  { value: "harvest", labelKey: "crop.stage.harvest", defaultLabel: "Maturity / Harvesting (कटाई अवस्था)" },
] as const;

export const IRRIGATION_OPTIONS = [
  { value: "rainfed", labelKey: "crop.irrigation.rainfed", defaultLabel: "Rainfed (वर्षा आधारित)" },
  { value: "canal", labelKey: "crop.irrigation.canal", defaultLabel: "Canal (नहर)" },
  { value: "drip", labelKey: "crop.irrigation.drip", defaultLabel: "Drip Irrigation (ड्रिप सिंचाई)" },
  { value: "sprinkler", labelKey: "crop.irrigation.sprinkler", defaultLabel: "Sprinkler (फव्वारा)" },
] as const;

export type CropValue = (typeof CROP_OPTIONS)[number]["value"];
export type CropStageValue = (typeof CROP_STAGE_OPTIONS)[number]["value"];

export interface SprayingAdvisory {
  suitability: "optimal" | "caution" | "unfavorable";
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
}

/**
 * Calculates pesticide/fertilizer spraying suitability based on wind speed and rain probability.
 */
export function calculateSprayingAdvisory(windSpeedKmH: number, rainProbPct: number): SprayingAdvisory {
  if (windSpeedKmH > 22 || rainProbPct > 50) {
    return {
      suitability: "unfavorable",
      titleEn: "Unfavorable for Spraying",
      titleHi: "छिड़काव के लिए प्रतिकूल",
      detailEn: `High wind (${windSpeedKmH} km/h) or rain risk (${rainProbPct}%) causes severe spray drift and chemical wash-off.`,
      detailHi: `तेज हवा (${windSpeedKmH} किमी/घंटा) या बारिश (${rainProbPct}%) से दवा उड़ने और धुलने का गंभीर जोखिम है।`,
    };
  }

  if (windSpeedKmH >= 14 || rainProbPct >= 20) {
    return {
      suitability: "caution",
      titleEn: "Spray with Caution (Calm Hours)",
      titleHi: "सावधानी से छिड़कें (शांत समय चुनें)",
      detailEn: "Spray only in early morning or late afternoon when wind speeds drop below 12 km/h.",
      detailHi: "केवल सुबह या देर शाम छिड़काव करें जब हवा की गति 12 किमी/घंटा से कम हो जाए।",
    };
  }

  return {
    suitability: "optimal",
    titleEn: "Optimal Spraying Window",
    titleHi: "छिड़काव के लिए सर्वोत्तम समय",
    detailEn: `Gentle winds (${windSpeedKmH} km/h) and clear skies ensure high chemical efficacy and uniform foliage coverage.`,
    detailHi: `शांत हवा (${windSpeedKmH} किमी/घंटा) और साफ मौसम से कीटनाशक का पूरा प्रभाव मिलेगा।`,
  };
}

export interface IrrigationAdvisory {
  action: "irrigate" | "postpone" | "adequate";
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
}

/**
 * Computes agronomic irrigation recommendation based on soil moisture and upcoming rainfall.
 */
export function calculateIrrigationAdvisory(
  soilMoisturePct: number,
  rainProbNext24h: number
): IrrigationAdvisory {
  if (rainProbNext24h >= 55) {
    return {
      action: "postpone",
      titleEn: "Postpone Irrigation (Rain Expected)",
      titleHi: "सिंचाई स्थगित करें (बारिश का अनुमान)",
      detailEn: "Natural rainfall expected within 24 hours. Postponing prevents waterlogging and nitrogen leaching.",
      detailHi: "अगले 24 घंटों में बारिश का अनुमान है। सिंचाई रोकने से जलभराव और खाद बहने से बचाव होगा।",
    };
  }

  if (soilMoisturePct < 35) {
    return {
      action: "irrigate",
      titleEn: "Light Irrigation Required",
      titleHi: "हल्की सिंचाई की आवश्यकता",
      detailEn: `Root zone moisture is depleted (${soilMoisturePct}%). Provide light irrigation to maintain turgor pressure.`,
      detailHi: `जड़ क्षेत्र में नमी कम है (${soilMoisturePct}%)। फसल को सूखने से बचाने के लिए हल्की सिंचाई करें।`,
    };
  }

  return {
    action: "adequate",
    titleEn: "Adequate Soil Moisture",
    titleHi: "पर्याप्त मृदा नमी",
    detailEn: `Current moisture level (${soilMoisturePct}%) is optimal for root uptake. No irrigation required today.`,
    detailHi: `वर्तमान नमी स्तर (${soilMoisturePct}%) पौधों के लिए आदर्श है। आज सिंचाई की जरूरत नहीं है।`,
  };
}

export interface CropStressRisk {
  hasRisk: boolean;
  severity: "low" | "medium" | "high";
  titleEn: string;
  titleHi: string;
  detailEn: string;
  detailHi: string;
}

/**
 * Identifies physiological crop risks (terminal heat, frost, lodging).
 */
export function evaluateCropStress(
  crop: string,
  stage: string,
  tempMax: number,
  tempMin: number
): CropStressRisk {
  // Terminal heat stress on wheat during flowering/grain filling
  if (crop === "wheat" && (stage === "flowering" || stage === "fruiting") && tempMax >= 32) {
    return {
      hasRisk: true,
      severity: "high",
      titleEn: "Terminal Heat Stress Warning",
      titleHi: "समय पूर्व गर्मी (टर्मिनल हीट) की चेतावनी",
      detailEn: `Day temperature of ${tempMax}°C during ${stage} accelerates maturity and causes grain shriveling. Apply light irrigation or potassium nitrate spray.`,
      detailHi: `${stage} अवस्था में ${tempMax}°C तापमान से दाना सिकुड़ने का खतरा है। हल्की सिंचाई या पोटेशियम नाइट्रेट का छिड़काव करें।`,
    };
  }

  // Frost risk for mustard / pulses during flowering
  if ((crop === "mustard" || crop === "pulses") && tempMin <= 4) {
    return {
      hasRisk: true,
      severity: "high",
      titleEn: "Ground Frost Hazard",
      titleHi: "पाला / शीतलहर का प्रकोप",
      detailEn: `Night temperature falling to ${tempMin}°C risks flower drop and pod damage. Irrigate field or light evening smoke around borders.`,
      detailHi: `रात का तापमान ${tempMin}°C तक गिरने से फूल झड़ने और पाले का खतरा है। खेत में हल्की सिंचाई करें या धुआं करें।`,
    };
  }

  return {
    hasRisk: false,
    severity: "low",
    titleEn: "Normal Crop Thermal Comfort",
    titleHi: "फसल के लिए अनुकूल तापमान",
    detailEn: "Temperatures remain within the physiological threshold for current crop stage.",
    detailHi: "तापमान फसल की वर्तमान अवस्था के लिए पूरी तरह अनुकूल है।",
  };
}
