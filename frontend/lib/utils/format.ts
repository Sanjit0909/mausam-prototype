export function formatTemp(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(decimals)}\u00b0`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value)}%`;
}

export function formatWind(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(0)} km/h`;
}

export function formatPressure(value: number | null | undefined): string {
  // Pressure 0 is invalid and must never display as a real observation.
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) return "--";
  return `${value.toFixed(0)} hPa`;
}

export function formatVisibility(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)} km`;
}

export function formatUv(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(1).replace(/\.0$/, "");
}

const COMPASS_POINTS_EN = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

const COMPASS_POINTS_HI = [
  "उ", "उ-उपू", "उपू", "पू-उपू", "पू", "पू-दपू", "दपू", "द-दपू",
  "द", "द-दप", "दप", "प-दप", "प", "प-उप", "उप", "उ-उप",
];

export function windDirectionLabel(degrees: number | null | undefined, locale: string = "en"): string {
  if (degrees === null || degrees === undefined) return "--";
  const index = Math.round(degrees / 22.5) % 16;
  return (locale === "hi" ? COMPASS_POINTS_HI : COMPASS_POINTS_EN)[index];
}

export function formatTime(iso: string | null | undefined, timezone?: string | null, locale: string = "en"): string {
  if (!iso) return "--";
  try {
    const date = new Date(iso.length === 16 ? `${iso}:00` : iso);
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return iso;
  }
}

export function formatDayLabel(dateStr: string, index: number, locale: string = "en"): string {
  // Callers should prefer translated Today/Tomorrow for index 0/1; this is weekday fallback.
  try {
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-US", { weekday: "short" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function formatHourLabel(iso: string, locale: string = "en"): string {
  try {
    const date = new Date(iso.length === 16 ? `${iso}:00` : iso);
    return new Intl.DateTimeFormat(locale === "hi" ? "hi-IN" : "en-US", { hour: "numeric", hour12: true }).format(date);
  } catch {
    return iso;
  }
}

export function uvCategory(uv: number | null | undefined): {
  labelKey: "common.uv.low" | "common.uv.moderate" | "common.uv.high" | "common.uv.veryHigh" | "common.uv.extreme" | null;
  color: string;
} {
  if (uv === null || uv === undefined) return { labelKey: null, color: "text-mist-400" };
  if (uv < 3) return { labelKey: "common.uv.low", color: "text-emerald-400" };
  if (uv < 6) return { labelKey: "common.uv.moderate", color: "text-amber-300" };
  if (uv < 8) return { labelKey: "common.uv.high", color: "text-amber-500" };
  if (uv < 11) return { labelKey: "common.uv.veryHigh", color: "text-rose-400" };
  return { labelKey: "common.uv.extreme", color: "text-rose-600" };
}

export function aqiColor(aqi: number | null | undefined): string {
  if (aqi === null || aqi === undefined) return "text-mist-400";
  if (aqi <= 50) return "text-emerald-400";
  if (aqi <= 100) return "text-amber-300";
  if (aqi <= 150) return "text-amber-500";
  if (aqi <= 200) return "text-rose-400";
  return "text-rose-600";
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "extreme":
      return "border-rose-600/40 bg-rose-600/10 text-rose-400";
    case "severe":
      return "border-rose-500/40 bg-rose-500/10 text-rose-400";
    case "moderate":
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    default:
      return "border-sky-500/40 bg-sky-500/10 text-sky-400";
  }
}

export function locationLabel(loc: { name: string; admin1?: string | null; country?: string | null }): string {
  return [loc.name, loc.admin1, loc.country].filter(Boolean).join(", ");
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "imd+fallback": "IMD + fallback",
  imd: "IMD",
  "open-meteo": "Open-Meteo",
  "open-meteo-marine": "Open-Meteo",
  "open-meteo-archive": "Open-Meteo",
  openweathermap: "OpenWeatherMap",
  weatherstack: "Weatherstack",
  stormglass: "Stormglass",
  incois: "INCOIS",
  unavailable: "Unavailable",
  nws: "NWS",
  derived: "MAUSAM Advisory",
  estimated: "Estimated",
  deepseek: "DeepSeek",
  gemini: "Gemini",
  openrouter: "OpenRouter",
  fallback: "MAUSAM Assistant",
};

/** Maps a backend `source` string (e.g. "open-meteo", "openweathermap") to the human-
 * readable provider name shown in SourceBadge - never invents a provider that isn't the
 * literal value the backend reported. */
export function providerDisplayName(source: string): string {
  return PROVIDER_DISPLAY_NAMES[source.toLowerCase()] ?? source;
}

/**
 * Localize presentation labels for known advisory/provider strings.
 * Never remaps Open-Meteo / OpenWeatherMap / Weatherstack / Stormglass to IMD.
 * IMD wording is only used for labels that are actually IMD (or pure "imd").
 */
export function localizeProviderLabel(
  provider: string,
  t: (key: "common.advisory" | "common.imdOfficialWarning" | "common.imdNowcast" | "common.imdCurrentWeather") => string
): string {
  const raw = (provider || "").trim();
  const key = raw.toLowerCase();
  if (!raw) return raw;

  // Non-IMD providers must keep their own identity even if the phrase contains
  // "current weather" / "model" / similar wording.
  if (
    key.includes("open-meteo") ||
    key.includes("openmeteo") ||
    key.includes("openweathermap") ||
    key.includes("weatherstack") ||
    key.includes("stormglass") ||
    key.includes("incois")
  ) {
    return raw;
  }

  if (key === "derived" || key === "mausam advisory" || key.includes("mausam advisory")) {
    return t("common.advisory");
  }
  if (key.includes("nowcast") && key.includes("imd")) return t("common.imdNowcast");
  // Only remap IMD current-weather phrases — never generic "current weather".
  if (key.includes("imd") && key.includes("current weather")) return t("common.imdCurrentWeather");
  if (key.includes("official warning") || (key.includes("imd") && key.includes("warning"))) {
    return t("common.imdOfficialWarning");
  }
  if (key === "imd") return "IMD";
  return PROVIDER_DISPLAY_NAMES[key] ?? raw;
}

/** True only when the weather bundle is pure IMD (no field-level fallbacks mixed in). */
export function isPureImdWeatherSource(source: string | null | undefined): boolean {
  return (source || "").trim().toLowerCase() === "imd";
}
