/**
 * Central PERSONA_CONFIG — section order, metric priority, terminology.
 * Keep section IDs aligned with backend persona_engine.PERSONA_SECTION_ORDER.
 */

export type PersonaId =
  | "farmer"
  | "runner"
  | "traveller"
  | "marine"
  | "family"
  | "health_vulnerable"
  | "disaster";

export type HomeSectionId =
  | "alerts"
  | "hero"
  | "crop_stage"
  | "agromet_advisory"
  | "irrigation"
  | "soil_moisture"
  | "crop_risk"
  | "farm_forecast"
  | "best_run_time"
  | "heat_humidity"
  | "aqi"
  | "uv"
  | "rain"
  | "wind"
  | "hydration"
  | "hourly_run"
  | "travel_risk"
  | "visibility"
  | "temperature"
  | "hourly_travel"
  | "packing"
  | "insights"
  | "metrics"
  | "recommendations"
  | "charts"
  | "hourly"
  | "daily"
  | "astronomy"
  | "marine";

export interface PersonaConfig {
  id: PersonaId;
  interestKeys: string[];
  sectionOrder: HomeSectionId[];
  metricPriority: string[];
  heroTitleKey: string;
  terminology: {
    forecast: string;
    recommendations: string;
  };
  /** Fully implemented specialized homepage */
  fullyImplemented: boolean;
}

export const PERSONA_CONFIG: Record<PersonaId, PersonaConfig> = {
  farmer: {
    id: "farmer",
    interestKeys: ["agriculture"],
    fullyImplemented: true,
    sectionOrder: [
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
    metricPriority: ["rain_probability", "humidity", "wind", "visibility", "pressure", "uv_index", "aqi"],
    heroTitleKey: "persona.home.farmer.hero",
    terminology: {
      forecast: "persona.term.farmForecast",
      recommendations: "persona.term.farmAdvice",
    },
  },
  runner: {
    id: "runner",
    interestKeys: ["outdoor_fitness"],
    fullyImplemented: true,
    sectionOrder: [
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
    metricPriority: ["aqi", "uv_index", "humidity", "rain_probability", "wind", "visibility", "pressure"],
    heroTitleKey: "persona.home.runner.hero",
    terminology: {
      forecast: "persona.term.runForecast",
      recommendations: "persona.term.fitnessAdvice",
    },
  },
  traveller: {
    id: "traveller",
    interestKeys: ["travel"],
    fullyImplemented: true,
    sectionOrder: [
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
    metricPriority: ["visibility", "rain_probability", "wind", "humidity", "aqi", "uv_index", "pressure"],
    heroTitleKey: "persona.home.traveller.hero",
    terminology: {
      forecast: "persona.term.travelForecast",
      recommendations: "persona.term.travelAdvice",
    },
  },
  marine: {
    id: "marine",
    interestKeys: ["marine_beach"],
    fullyImplemented: false,
    sectionOrder: [
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
    metricPriority: ["wind", "visibility", "rain_probability", "humidity", "pressure", "uv_index", "aqi"],
    heroTitleKey: "persona.home.marine.hero",
    terminology: {
      forecast: "home.daily",
      recommendations: "home.recommended",
    },
  },
  family: {
    id: "family",
    interestKeys: ["family", "commuting", "events"],
    fullyImplemented: false,
    sectionOrder: [
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
    metricPriority: ["rain_probability", "aqi", "uv_index", "visibility", "wind", "humidity", "pressure"],
    heroTitleKey: "persona.home.family.hero",
    terminology: {
      forecast: "home.daily",
      recommendations: "home.recommended",
    },
  },
  health_vulnerable: {
    id: "health_vulnerable",
    interestKeys: ["health", "elderly"],
    fullyImplemented: false,
    sectionOrder: [
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
    metricPriority: ["aqi", "uv_index", "humidity", "rain_probability", "wind", "visibility", "pressure"],
    heroTitleKey: "persona.home.health.hero",
    terminology: {
      forecast: "home.daily",
      recommendations: "home.recommended",
    },
  },
  disaster: {
    id: "disaster",
    interestKeys: [],
    fullyImplemented: false,
    sectionOrder: [
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
    metricPriority: ["wind", "rain_probability", "visibility", "humidity", "pressure", "aqi", "uv_index"],
    heroTitleKey: "persona.home.disaster.hero",
    terminology: {
      forecast: "home.daily",
      recommendations: "home.recommended",
    },
  },
};

const INTEREST_TO_PERSONA: Record<string, PersonaId> = {
  agriculture: "farmer",
  outdoor_fitness: "runner",
  travel: "traveller",
  marine_beach: "marine",
  family: "family",
  commuting: "family",
  events: "family",
  health: "health_vulnerable",
  elderly: "health_vulnerable",
};

export function resolvePersonaId(
  interests: string[],
  primaryOverride?: PersonaId | null
): PersonaId {
  if (primaryOverride && primaryOverride in PERSONA_CONFIG) return primaryOverride;
  for (const interest of interests) {
    const mapped = INTEREST_TO_PERSONA[interest];
    if (mapped) return mapped;
  }
  return "family";
}

export function getPersonaConfig(persona: PersonaId): PersonaConfig {
  return PERSONA_CONFIG[persona];
}

/** Deterministic proof helper for tests / SIH demo. */
export function sectionOrdersDiffer(a: PersonaId, b: PersonaId): boolean {
  return PERSONA_CONFIG[a].sectionOrder.join("|") !== PERSONA_CONFIG[b].sectionOrder.join("|");
}

export function assertPersonaHomepagesDistinct(): void {
  if (!sectionOrdersDiffer("runner", "farmer")) throw new Error("Runner == Farmer sections");
  if (!sectionOrdersDiffer("farmer", "traveller")) throw new Error("Farmer == Traveller sections");
  if (!sectionOrdersDiffer("runner", "traveller")) throw new Error("Runner == Traveller sections");
  const farmerHas = new Set(PERSONA_CONFIG.farmer.sectionOrder);
  const runnerHas = new Set(PERSONA_CONFIG.runner.sectionOrder);
  const travelHas = new Set(PERSONA_CONFIG.traveller.sectionOrder);
  if (!farmerHas.has("irrigation") || !farmerHas.has("crop_stage")) {
    throw new Error("Farmer missing farm sections");
  }
  if (runnerHas.has("irrigation") || runnerHas.has("crop_stage")) {
    throw new Error("Runner must not show farm sections");
  }
  if (travelHas.has("best_run_time") || travelHas.has("irrigation")) {
    throw new Error("Traveller must not show runner/farm specialty sections");
  }
  if (!runnerHas.has("best_run_time") || !travelHas.has("travel_risk")) {
    throw new Error("Missing specialty priority sections");
  }
}
