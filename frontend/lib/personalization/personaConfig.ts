/**
 * Central PERSONA_CONFIG — section order, metric priority, terminology.
 * Aligned with SIH 2026 Problem Statement SIH26076: 8 Primary Personas.
 */

export type PersonaId =
  | "runner"
  | "farmer"
  | "commuter"
  | "health"
  | "health_vulnerable"
  | "traveler"
  | "traveller"
  | "family"
  | "marine"
  | "event_planner"
  | "disaster";

export type HomeSectionId =
  | "alerts"
  | "hero"
  // Farmer specialty
  | "crop_stage"
  | "agromet_advisory"
  | "irrigation"
  | "soil_moisture"
  | "crop_risk"
  | "farm_forecast"
  | "spraying_window"
  // Runner specialty
  | "best_run_time"
  | "heat_humidity"
  | "hydration"
  | "hourly_run"
  // Commuter specialty
  | "rush_hour_visibility"
  | "waterlogging_risk"
  | "transit_disruption"
  | "hourly_commute"
  // Health specialty
  | "aqi_breakdown"
  | "respiratory_risk"
  | "extreme_temp"
  // Traveler specialty
  | "travel_risk"
  | "packing"
  | "hourly_travel"
  | "sightseeing_window"
  // Family specialty
  | "school_readiness"
  | "outdoor_play"
  | "child_clothing"
  // Marine specialty
  | "tides_swell"
  | "sea_state"
  | "fisherman_warning"
  // Event planner specialty
  | "hourly_rain_prob"
  | "canopy_wind_risk"
  | "guest_comfort"
  | "backup_trigger"
  // General weather sections
  | "aqi"
  | "uv"
  | "rain"
  | "wind"
  | "visibility"
  | "temperature"
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
  labelKey: string;
  interestKeys: string[];
  sectionOrder: HomeSectionId[];
  metricPriority: string[];
  heroTitleKey: string;
  terminology: {
    forecast: string;
    recommendations: string;
  };
  fullyImplemented: boolean;
}

export const PERSONA_CONFIG: Record<string, PersonaConfig> = {
  runner: {
    id: "runner",
    labelKey: "landing.persona.fitness",
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
  farmer: {
    id: "farmer",
    labelKey: "landing.persona.agri",
    interestKeys: ["agriculture"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "crop_stage",
      "agromet_advisory",
      "spraying_window",
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
  commuter: {
    id: "commuter",
    labelKey: "landing.persona.commuter",
    interestKeys: ["commuting"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "rush_hour_visibility",
      "waterlogging_risk",
      "transit_disruption",
      "hourly_commute",
      "rain",
      "visibility",
      "wind",
      "metrics",
      "insights",
      "recommendations",
      "charts",
      "hourly",
      "daily",
      "astronomy",
    ],
    metricPriority: ["visibility", "rain_probability", "wind", "temperature", "humidity", "aqi", "pressure"],
    heroTitleKey: "persona.home.commuter.hero",
    terminology: {
      forecast: "persona.term.commuterForecast",
      recommendations: "persona.term.commuterAdvice",
    },
  },
  health: {
    id: "health",
    labelKey: "landing.persona.health",
    interestKeys: ["health", "elderly"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "aqi_breakdown",
      "respiratory_risk",
      "extreme_temp",
      "aqi",
      "uv",
      "heat_humidity",
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
  health_vulnerable: {
    id: "health_vulnerable",
    labelKey: "landing.persona.health",
    interestKeys: ["health", "elderly"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "aqi_breakdown",
      "respiratory_risk",
      "extreme_temp",
      "aqi",
      "uv",
      "heat_humidity",
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
  traveler: {
    id: "traveler",
    labelKey: "landing.persona.travel",
    interestKeys: ["travel"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "travel_risk",
      "sightseeing_window",
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
  traveller: {
    id: "traveller",
    labelKey: "landing.persona.travel",
    interestKeys: ["travel"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "travel_risk",
      "sightseeing_window",
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
  family: {
    id: "family",
    labelKey: "landing.persona.family",
    interestKeys: ["family"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "school_readiness",
      "outdoor_play",
      "child_clothing",
      "rain",
      "aqi",
      "uv",
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
  marine: {
    id: "marine",
    labelKey: "landing.persona.marine",
    interestKeys: ["marine_beach"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "tides_swell",
      "sea_state",
      "fisherman_warning",
      "wind",
      "visibility",
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
  event_planner: {
    id: "event_planner",
    labelKey: "landing.persona.events",
    interestKeys: ["events"],
    fullyImplemented: true,
    sectionOrder: [
      "alerts",
      "hero",
      "hourly_rain_prob",
      "canopy_wind_risk",
      "guest_comfort",
      "backup_trigger",
      "rain",
      "wind",
      "uv",
      "metrics",
      "insights",
      "recommendations",
      "charts",
      "hourly",
      "daily",
      "astronomy",
    ],
    metricPriority: ["rain_probability", "wind", "humidity", "uv_index", "temperature", "visibility", "pressure"],
    heroTitleKey: "persona.home.event.hero",
    terminology: {
      forecast: "persona.term.eventForecast",
      recommendations: "persona.term.eventAdvice",
    },
  },
  disaster: {
    id: "disaster",
    labelKey: "landing.persona.emergency",
    interestKeys: [],
    fullyImplemented: true,
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
  commuting: "commuter",
  health: "health",
  elderly: "health",
  travel: "traveler",
  family: "family",
  marine_beach: "marine",
  events: "event_planner",
};

export function resolvePersonaId(
  interests: string[],
  primaryOverride?: string | null
): PersonaId {
  if (primaryOverride) {
    if (primaryOverride === "traveller") return "traveler";
    if (primaryOverride === "health_vulnerable") return "health";
    if (primaryOverride in PERSONA_CONFIG) return primaryOverride as PersonaId;
  }
  for (const interest of interests) {
    const mapped = INTEREST_TO_PERSONA[interest];
    if (mapped) return mapped;
  }
  return "runner"; // Default to Runner if unassigned
}

export function getPersonaConfig(persona: string): PersonaConfig {
  const norm =
    persona === "traveller" ? "traveler" : persona === "health_vulnerable" ? "health" : persona;
  return PERSONA_CONFIG[norm] ?? PERSONA_CONFIG.runner;
}

export function getAllPersonas(): PersonaConfig[] {
  return [
    PERSONA_CONFIG.runner,
    PERSONA_CONFIG.farmer,
    PERSONA_CONFIG.commuter,
    PERSONA_CONFIG.health,
    PERSONA_CONFIG.traveler,
    PERSONA_CONFIG.family,
    PERSONA_CONFIG.marine,
    PERSONA_CONFIG.event_planner,
  ];
}
