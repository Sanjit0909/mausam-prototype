export function formatTemp(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(decimals)}\u00b0`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value)}%`;
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export function windDirectionLabel(degrees: number | null | undefined): string {
  if (degrees === null || degrees === undefined) return "--";
  const index = Math.round(degrees / 22.5) % 16;
  return COMPASS_POINTS[index];
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
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
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

export function uvCategory(uv: number | null | undefined): { label: string; color: string } {
  if (uv === null || uv === undefined) return { label: "--", color: "text-mist-400" };
  if (uv < 3) return { label: "Low", color: "text-emerald-400" };
  if (uv < 6) return { label: "Moderate", color: "text-amber-300" };
  if (uv < 8) return { label: "High", color: "text-amber-500" };
  if (uv < 11) return { label: "Very High", color: "text-rose-400" };
  return { label: "Extreme", color: "text-rose-600" };
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
