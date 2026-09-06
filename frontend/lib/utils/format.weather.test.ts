/**
 * Lightweight checks for weather display / localization helpers.
 * Run: npx --yes tsx lib/utils/format.weather.test.ts  (from frontend/)
 */
import {
  formatPressure,
  formatVisibility,
  formatWind,
  formatUv,
  windDirectionLabel,
  localizeProviderLabel,
  isPureImdWeatherSource,
} from "./format";
import { localizePersonaCardText } from "../i18n/localizePersona";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const t = ((key: string) => {
  const map: Record<string, string> = {
    "common.advisory": "Advisory",
    "common.imdOfficialWarning": "IMD Official Warning",
    "common.imdNowcast": "IMD Nowcast",
    "common.imdCurrentWeather": "IMD – Official Current Weather",
  };
  return map[key] ?? key;
}) as Parameters<typeof localizeProviderLabel>[1];

assert(formatPressure(0) === "--", "pressure 0 must be unavailable");
assert(formatPressure(1008) === "1008 hPa", "pressure valid");
assert(formatPressure(null) === "--", "pressure null");
assert(formatWind(0) === "0 km/h", "calm wind stays 0");
assert(formatWind(null) === "--", "wind null");
assert(formatVisibility(null) === "--", "visibility null");
assert(formatVisibility(7) === "7.0 km", "visibility value");
assert(formatUv(0) === "0", "uv 0 valid");
assert(formatUv(null) === "--", "uv null");
assert(windDirectionLabel(null, "hi") === "--", "wind dir null");
assert(
  localizePersonaCardText("Official crop advisory currently unavailable", "hi").includes("उपलब्ध नहीं"),
  "hindi persona"
);
assert(localizePersonaCardText("Farm Weather", "en") === "Farm Weather", "en passthrough");

// Provenance: never remap model providers to IMD
assert(
  localizeProviderLabel("Open-Meteo – Model Current Weather", t).includes("Open-Meteo"),
  "Open-Meteo must not become IMD"
);
assert(
  !localizeProviderLabel("Open-Meteo – Model Current Weather", t).includes("IMD – Official"),
  "Open-Meteo label must not claim IMD Official"
);
assert(
  localizeProviderLabel("OpenWeatherMap – Model Current Weather", t).includes("OpenWeatherMap"),
  "OWM identity preserved"
);
assert(
  localizeProviderLabel("Weatherstack – Current Weather", t).includes("Weatherstack"),
  "Weatherstack identity preserved"
);
assert(
  localizeProviderLabel("IMD – Official Current Weather", t) === "IMD – Official Current Weather",
  "true IMD current weather still localizes"
);
assert(isPureImdWeatherSource("imd") === true, "pure imd");
assert(isPureImdWeatherSource("imd+fallback") === false, "mixed not pure imd");
assert(isPureImdWeatherSource("open-meteo") === false, "om not pure imd");

console.log("format.weather.test.ts: all assertions passed");
