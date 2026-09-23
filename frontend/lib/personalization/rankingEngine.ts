/**
 * RITUDARPAN — Deterministic Multi-Factor Card Scoring and Ranking Engine.
 * 
 * Mathematical Model:
 * FinalScore = PersonaWeight (0-40) + WeatherSeverity (0-25) + TimeRelevance (0-15) 
 *            + LocationRelevance (0-10) + UserPreference (0-20) + InteractionBonus (0-10)
 * 
 * Fully explainable — powers the "Why am I seeing this?" modal without black-box ML.
 */

export type PersonaId =
  | "runner"
  | "farmer"
  | "commuter"
  | "health"
  | "traveler"
  | "family"
  | "marine"
  | "event_planner";

export interface ScoreBreakdown {
  cardId: string;
  totalScore: number;
  personaPoints: number;
  severityPoints: number;
  timePoints: number;
  locationPoints: number;
  userPrefPoints: number;
  interactionPoints: number;
  isPinned: boolean;
  isHidden: boolean;
  topReasonEn: string;
  topReasonHi: string;
}

export interface WeatherScoringContext {
  temperature?: number;
  feelsLike?: number;
  humidity?: number;
  windSpeed?: number;
  rainProbability?: number;
  visibilityKm?: number;
  uvIndex?: number;
  aqi?: number;
  isCoastal?: boolean;
  currentHourIST?: number;
  interactionCounts?: Record<string, number>;
}

// 1. Base Persona Relevance Weights (0 - 40 points)
const PERSONA_BASE_WEIGHTS: Record<PersonaId, Record<string, number>> = {
  runner: {
    best_run_time: 40,
    heat_humidity: 35,
    aqi: 32,
    hydration: 30,
    uv: 28,
    rain: 26,
    wind: 20,
    hourly_run: 22,
  },
  farmer: {
    crop_stage: 40,
    agromet_advisory: 38,
    spraying_window: 36,
    soil_moisture: 35,
    irrigation: 34,
    crop_risk: 32,
    farm_forecast: 28,
  },
  commuter: {
    rush_hour_visibility: 40,
    waterlogging_risk: 38,
    transit_disruption: 35,
    hourly_commute: 32,
    rain: 30,
    wind: 22,
    visibility: 28,
  },
  health: {
    aqi_breakdown: 40,
    respiratory_risk: 38,
    extreme_temp: 35,
    uv: 32,
    heat_humidity: 30,
    humidity: 24,
  },
  traveler: {
    packing_checklist: 40,
    transit_disruption: 36,
    sightseeing_window: 34,
    rain: 30,
    visibility: 28,
    hourly_travel: 26,
  },
  family: {
    school_readiness: 40,
    outdoor_play: 36,
    child_clothing: 32,
    rain: 30,
    aqi: 28,
    uv: 24,
  },
  marine: {
    tides_swell: 40,
    sea_state: 38,
    fisherman_warning: 36,
    wind: 34,
    visibility: 26,
  },
  event_planner: {
    hourly_rain_prob: 40,
    canopy_wind_risk: 38,
    guest_comfort: 34,
    backup_trigger: 30,
    uv: 25,
  },
};

/**
 * Calculates deterministic multi-factor score for an individual card.
 */
export function scoreCard(
  cardId: string,
  personaId: PersonaId,
  ctx: WeatherScoringContext,
  pinnedCards: Set<string> = new Set(),
  hiddenCards: Set<string> = new Set()
): ScoreBreakdown {
  const isPinned = pinnedCards.has(cardId);
  const isHidden = hiddenCards.has(cardId);

  // If hidden by user, effectively drop
  if (isHidden) {
    return {
      cardId,
      totalScore: -999,
      personaPoints: 0,
      severityPoints: 0,
      timePoints: 0,
      locationPoints: 0,
      userPrefPoints: 0,
      interactionPoints: 0,
      isPinned: false,
      isHidden: true,
      topReasonEn: "Hidden by user preference",
      topReasonHi: "उपयोगकर्ता प्राथमिकता द्वारा छिपाया गया",
    };
  }

  // 1. Persona Base Weight
  const personaPoints = PERSONA_BASE_WEIGHTS[personaId]?.[cardId] ?? 15;

  // 2. Weather Severity Boost (0 - 25 points)
  let severityPoints = 0;
  let severityReasonEn = "";
  let severityReasonHi = "";

  if ((cardId === "rain" || cardId.includes("waterlog") || cardId.includes("rain_prob")) && (ctx.rainProbability ?? 0) >= 60) {
    severityPoints += 22;
    severityReasonEn = `Rain probability is high (${ctx.rainProbability}%)`;
    severityReasonHi = `बारिश की संभावना अधिक है (${ctx.rainProbability}%)`;
  }
  if ((cardId === "aqi" || cardId.includes("respiratory") || cardId.includes("aqi_breakdown")) && (ctx.aqi ?? 0) >= 200) {
    severityPoints += 25;
    severityReasonEn = `Air Quality Index is poor (${ctx.aqi} AQI)`;
    severityReasonHi = `वायु गुणवत्ता सूचकांक खराब है (${ctx.aqi} AQI)`;
  }
  if ((cardId === "heat_humidity" || cardId.includes("hydration") || cardId.includes("extreme_temp")) && (ctx.temperature ?? 0) >= 38) {
    severityPoints += 22;
    severityReasonEn = `Extreme temperature detected (${ctx.temperature}°C)`;
    severityReasonHi = `अत्यधिक तापमान दर्ज किया गया (${ctx.temperature}°C)`;
  }
  if ((cardId === "wind" || cardId.includes("canopy") || cardId.includes("sea_state")) && (ctx.windSpeed ?? 0) >= 30) {
    severityPoints += 20;
    severityReasonEn = `Elevated wind speeds (${ctx.windSpeed} km/h)`;
    severityReasonHi = `तेज हवा की गति (${ctx.windSpeed} किमी/घंटा)`;
  }
  if ((cardId.includes("visibility") || cardId.includes("transit") || cardId.includes("fog")) && (ctx.visibilityKm ?? 10) < 1.5) {
    severityPoints += 24;
    severityReasonEn = `Reduced visibility detected (${ctx.visibilityKm} km)`;
    severityReasonHi = `दृश्यता में भारी गिरावट दर्ज (${ctx.visibilityKm} किमी)`;
  }
  if ((cardId === "spraying_window") && (ctx.windSpeed ?? 0) < 15 && (ctx.rainProbability ?? 0) < 20) {
    severityPoints += 18;
    severityReasonEn = "Optimal conditions for agricultural spraying";
    severityReasonHi = "कीटनाशक छिड़काव के लिए अनुकूल मौसम";
  }

  // Cap severity boost at 25
  severityPoints = Math.min(severityPoints, 25);

  // 3. Time Relevance (0 - 15 points)
  let timePoints = 0;
  let timeReasonEn = "";
  let timeReasonHi = "";
  const hour = ctx.currentHourIST ?? new Date().getHours();

  const isMorning = hour >= 5 && hour <= 10;
  const isEvening = hour >= 16 && hour <= 20;
  const isMidday = hour >= 11 && hour <= 15;

  if (isMorning && (cardId === "best_run_time" || cardId.includes("rush_hour") || cardId.includes("school"))) {
    timePoints = 15;
    timeReasonEn = "Peak morning window";
    timeReasonHi = "सुबह का मुख्य समय";
  } else if (isEvening && (cardId.includes("commute") || cardId.includes("outdoor_play") || cardId.includes("guest_comfort"))) {
    timePoints = 14;
    timeReasonEn = "Evening commute & outdoor activity window";
    timeReasonHi = "शाम की यात्रा और बाहरी गतिविधि का समय";
  } else if (isMidday && (cardId === "uv" || cardId.includes("heat") || cardId.includes("child_clothing"))) {
    timePoints = 12;
    timeReasonEn = "Peak afternoon solar radiation";
    timeReasonHi = "दोपहर की तेज धूप और गर्मी";
  }

  // 4. Location Relevance (0 - 10 points)
  let locationPoints = 0;
  let locationReasonEn = "";
  let locationReasonHi = "";

  if (cardId.includes("tide") || cardId.includes("sea") || cardId.includes("fisherman")) {
    if (ctx.isCoastal) {
      locationPoints = 10;
      locationReasonEn = "Relevant for coastal waters";
      locationReasonHi = "तटीय क्षेत्र के लिए प्रासंगिक";
    } else {
      locationPoints = -30; // Deprioritize inland
    }
  } else if (personaId === "farmer" && (cardId.includes("crop") || cardId.includes("soil") || cardId.includes("agromet"))) {
    locationPoints = 8;
    locationReasonEn = "Agricultural district relevance";
    locationReasonHi = "कृषि क्षेत्र के लिए अनुकूलित";
  }

  // 5. User Preference Points (0 - 25 points)
  const userPrefPoints = isPinned ? 25 : 0;

  // 6. Interaction Bonus (0 - 10 points)
  const tapCount = ctx.interactionCounts?.[cardId] ?? 0;
  const interactionPoints = Math.min(tapCount * 3, 10);

  // Calculate Final Score
  const totalScore = personaPoints + severityPoints + timePoints + locationPoints + userPrefPoints + interactionPoints;

  // Identify Top Contributing Reason
  let topReasonEn = severityReasonEn || timeReasonEn || locationReasonEn || `Essential priority for ${personaId}`;
  let topReasonHi = severityReasonHi || timeReasonHi || locationReasonHi || `${personaId} के लिए प्राथमिकता`;

  if (isPinned) {
    topReasonEn = "Pinned to top by you";
    topReasonHi = "आपके द्वारा शीर्ष पर पिन किया गया";
  }

  return {
    cardId,
    totalScore,
    personaPoints,
    severityPoints,
    timePoints,
    locationPoints,
    userPrefPoints,
    interactionPoints,
    isPinned,
    isHidden,
    topReasonEn,
    topReasonHi,
  };
}

/**
 * Sorts card IDs deterministically according to their FinalScore.
 */
export function rankCardIds(
  cardIds: string[],
  personaId: PersonaId,
  ctx: WeatherScoringContext,
  pinnedCards: Set<string> = new Set(),
  hiddenCards: Set<string> = new Set()
): { orderedIds: string[]; scoreMap: Record<string, ScoreBreakdown> } {
  const scoreMap: Record<string, ScoreBreakdown> = {};

  for (const id of cardIds) {
    scoreMap[id] = scoreCard(id, personaId, ctx, pinnedCards, hiddenCards);
  }

  // Filter out hidden cards
  const visible = cardIds.filter((id) => !scoreMap[id]?.isHidden);

  // Sort descending by totalScore (pinned cards naturally float to the top)
  const orderedIds = visible.sort((a, b) => {
    const scoreA = scoreMap[a]?.totalScore ?? 0;
    const scoreB = scoreMap[b]?.totalScore ?? 0;
    return scoreB - scoreA;
  });

  return { orderedIds, scoreMap };
}

// Local Storage Keys for user customization
const PINNED_STORAGE_PREFIX = "mausam:pinned_cards:";
const HIDDEN_STORAGE_PREFIX = "mausam:hidden_cards:";

export function loadPinnedCards(personaId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${PINNED_STORAGE_PREFIX}${personaId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function savePinnedCards(personaId: string, pinned: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${PINNED_STORAGE_PREFIX}${personaId}`,
      JSON.stringify(Array.from(pinned))
    );
  } catch {
    /* ignore */
  }
}

export function loadHiddenCards(personaId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${HIDDEN_STORAGE_PREFIX}${personaId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function saveHiddenCards(personaId: string, hidden: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${HIDDEN_STORAGE_PREFIX}${personaId}`,
      JSON.stringify(Array.from(hidden))
    );
  } catch {
    /* ignore */
  }
}
