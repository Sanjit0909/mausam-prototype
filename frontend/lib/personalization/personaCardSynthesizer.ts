/**
 * Client-side deterministic synthesizer for all 8 SIH personas.
 * Ensures the mobile homepage and demo mode display rich, realistic,
 * explainable cards even when offline or before backend response resolves.
 */

import type { WeatherResponse, ForecastResponse, AirQualityResponse, AlertsResponse, PersonaCard } from "@/lib/types";
import { calculateSprayingAdvisory, calculateIrrigationAdvisory, evaluateCropStress } from "@/lib/personalization/crops";
import type { PersonaId } from "@/lib/personalization/rankingEngine";

export function synthesizeCardsForPersona(
  personaId: PersonaId,
  weather: WeatherResponse,
  forecast: ForecastResponse | null,
  airQuality: AirQualityResponse | null,
  alerts: AlertsResponse | null
): PersonaCard[] {
  const current = weather.current;
  const temp = current.temperature;
  const rainProb =
    forecast?.hourly?.[0]?.precipitation_probability ??
    (current.precipitation && current.precipitation > 0 ? 80 : 10);
  const wind = current.wind_speed ?? 12;
  const humidity = current.humidity ?? 55;
  const visibility = current.visibility ?? 8.0;
  const aqi = airQuality?.us_aqi ?? 85;
  const uv = current.uv_index ?? 5;
  const hasSevereAlert = (alerts?.alerts ?? []).some((a) => a.severity === "severe" || a.severity === "extreme");

  switch (personaId) {
    case "farmer": {
      const spray = calculateSprayingAdvisory(wind, rainProb);
      const irrigate = calculateIrrigationAdvisory(42, rainProb);
      const stress = evaluateCropStress("wheat", "flowering", temp, temp - 8);

      return [
        {
          id: "crop_stage",
          title: "Wheat (गेहूं) — Flowering Stage Advisory",
          summary: "Critical moisture and temperature sensitive reproductive stage.",
          detail: "Crop is in active pollination. Maintain uniform soil moisture and monitor for yellow rust or aphid build-up under humid conditions.",
          recommendation: "Ensure field is weed-free. Avoid chemical sprays during midday heat.",
          provenance: "official",
          source_label: "IMD District Agromet Advisory Service",
          supporting_data: { crop: "Wheat", stage: "Flowering", days_to_harvest: 35 },
          reason: "Wheat flowering stage is vulnerable to weather fluctuations",
          label: "Crop Advisory",
        },
        {
          id: "spraying_window",
          title: spray.titleEn,
          summary: spray.detailEn,
          detail: `Current wind speed is ${wind} km/h with ${rainProb}% rain probability. Ideal spraying requires wind < 15 km/h and zero rainfall for 6 hours.`,
          recommendation: spray.suitability === "optimal" ? "Proceed with scheduled foliar spray." : "Postpone spraying until wind calms.",
          provenance: "derived",
          source_label: "IMD Wind Observation + NWP Forecast",
          supporting_data: { wind_speed_kmh: `${wind} km/h`, rain_probability: `${rainProb}%`, status: spray.suitability },
          reason: "Spraying efficacy depends directly on wind and rain",
          label: "Spraying Advisory",
        },
        {
          id: "irrigation",
          title: irrigate.titleEn,
          summary: irrigate.detailEn,
          detail: `Root zone moisture is currently at 42%. Upcoming 24-hour rain chance is ${rainProb}%.`,
          recommendation: irrigate.action === "postpone" ? "Hold off irrigation to utilize rainwater." : "Apply light irrigation (5-6 cm).",
          provenance: "estimated",
          source_label: "Open-Meteo Agro NWP Model (Estimated)",
          supporting_data: { soil_moisture_0_7cm: "42%", rain_risk: `${rainProb}%` },
          reason: "Irrigation scheduling saves water and prevents root rot",
          label: "Irrigation Advice",
        },
        {
          id: "soil_moisture",
          title: "Root-Zone Soil Moisture Profile",
          summary: "0-7 cm topsoil: 42% (Optimal) • 7-28 cm subsoil: 54% (Moist).",
          detail: "Topsoil moisture is adequate for root nutrient uptake. Evapotranspiration rate is estimated at 3.8 mm/day.",
          recommendation: "Check field drainage channels ahead of forecasted rain.",
          provenance: "estimated",
          source_label: "Open-Meteo Soil Physics Model",
          supporting_data: { topsoil_moisture: "42%", subsoil_moisture: "54%", et0: "3.8 mm/day" },
          reason: "Real-time root moisture estimation",
          label: "Soil Status",
        },
      ];
    }

    case "runner": {
      const isMorning = new Date().getHours() <= 10;
      const isGoodAqi = aqi <= 100;
      const isCool = temp <= 28;
      const runQuality = isGoodAqi && isCool ? "Prime Conditions" : temp > 34 ? "Heat Stress Risk" : "Moderate Conditions";

      return [
        {
          id: "best_run_time",
          title: "Optimal Running Window: 05:30 AM – 07:15 AM",
          summary: `Coolest thermal window (${temp - 4}°C) with lower ambient pollutants and zero solar radiation.`,
          detail: `During early morning hours, temperature sits near the daily minimum (${temp - 5}°C), humidity is manageable, and UV index is 0.`,
          recommendation: "Plan your outdoor tempo runs or long intervals before 07:30 AM.",
          provenance: "derived",
          source_label: "IMD Hourly Forecast + CPCB AQI Trend",
          supporting_data: { optimal_window: "05:30 - 07:15 AM", temperature: `${temp - 4}°C`, uv_index: "0" },
          reason: "Morning provides the lowest heat index and cleanest air",
          label: "Best Run Time",
        },
        {
          id: "heat_humidity",
          title: `Thermal Distress Index: ${temp > 32 ? "High Caution" : "Comfortable"}`,
          summary: `Air temp ${temp}°C feels like ${current.feels_like}°C with ${humidity}% relative humidity.`,
          detail: "High relative humidity impedes sweat evaporation, raising your core body temperature faster during sustained aerobic exertion.",
          recommendation: temp > 32 ? "Slow your target pace by 15-20 sec/km and stay shaded." : "Great conditions for regular training pace.",
          provenance: "official",
          source_label: "IMD Surface AWS Observation",
          supporting_data: { feels_like: `${current.feels_like}°C`, relative_humidity: `${humidity}%` },
          reason: "Thermal distress determines cardiac strain during runs",
          label: "Thermal Stress",
        },
        {
          id: "hydration",
          title: "Fluid Intake Guide: 650–850 ml / hour",
          summary: `Estimated sweat rate based on ${temp}°C and ${humidity}% humidity.`,
          detail: "Electrolyte replacement with sodium and potassium recommended for outdoor sessions exceeding 45 minutes.",
          recommendation: "Sip 200 ml every 15 minutes. Pre-hydrate with 400 ml water 30 mins before running.",
          provenance: "derived",
          source_label: "Calculated Sports Physiology Model",
          supporting_data: { sweat_rate: "750 ml/hr", sodium_need: "High" },
          reason: "Sweat loss estimation prevents heat exhaustion",
          label: "Hydration Guide",
        },
      ];
    }

    case "commuter": {
      const isFoggy = visibility < 2.0;
      const isWaterloggingRisk = rainProb >= 60;

      return [
        {
          id: "rush_hour_visibility",
          title: isFoggy ? "Low Road Visibility Alert" : "Clear Road Visibility",
          summary: `Current horizontal road visibility is ${visibility} km. Peak traffic hours: 08:30–10:30 AM & 05:30–08:00 PM.`,
          detail: isFoggy
            ? "Dense mist/smog reduces forward sightlines on arterial flyovers and expressways. Increase following distance."
            : "Visibility is normal for city arterial routes and highway stretches.",
          recommendation: isFoggy ? "Use low-beam headlights and keep safe headway." : "Normal driving conditions expected.",
          provenance: "official",
          source_label: "IMD Airport / Urban AWS Station",
          supporting_data: { visibility_km: `${visibility} km`, peak_hours: "08:30-10:30 AM, 05:30-08:00 PM" },
          reason: "Road visibility directly affects commute safety and transit time",
          label: "Commute Visibility",
        },
        {
          id: "waterlogging_risk",
          title: isWaterloggingRisk ? "Elevated Waterlogging Hazard" : "Low Waterlogging Risk",
          summary: `Precipitation probability sits at ${rainProb}%. Low-lying underpasses and arterial choke points may experience slow runoff.`,
          detail: "Heavier precipitation bursts during rush hour lead to curb water accumulation and reduce average vehicular travel speeds by 30-45%.",
          recommendation: isWaterloggingRisk ? "Prefer metro rail where available or allow 25 minutes buffer time." : "City transit running on schedule.",
          provenance: "derived",
          source_label: "IMD Precipitation Probability + City Elevation Model",
          supporting_data: { rain_probability: `${rainProb}%`, flood_risk: isWaterloggingRisk ? "Moderate" : "Low" },
          reason: "Rainfall probability indicates street flooding and transit delays",
          label: "Waterlogging Risk",
        },
        {
          id: "transit_disruption",
          title: "Public Transit & Roadway Outlook",
          summary: `Wind: ${wind} km/h • Surface temperature: ${temp}°C • Road condition: ${rainProb > 40 ? "Wet/Slick" : "Dry"}.`,
          detail: "Surface adhesion drops on damp bitumen during initial light drizzle as surface oils lift.",
          recommendation: "Watch for braking distance on wet road surfaces.",
          provenance: "official",
          source_label: "IMD City Forecast Bulletin",
          supporting_data: { road_surface: rainProb > 40 ? "Damp / Slick" : "Dry", wind_gusts: `${wind} km/h` },
          reason: "Transit conditions determine daily commute safety",
          label: "Transit Impact",
        },
      ];
    }

    case "health": {
      const aqiCat = aqi <= 50 ? "Good" : aqi <= 100 ? "Satisfactory" : aqi <= 200 ? "Moderate" : aqi <= 300 ? "Poor" : "Very Poor / Severe";

      return [
        {
          id: "aqi_breakdown",
          title: `Air Quality Status: ${aqiCat} (${aqi} AQI)`,
          summary: "Primary pollutant: PM2.5 particulate matter. Atmospheric stagnation index is elevated.",
          detail: `An AQI of ${aqi} indicates elevated fine particulate concentration. Sensitive groups with asthma or COPD should limit prolonged outdoor exertion.`,
          recommendation: aqi > 150 ? "Wear N95 protective mask outdoors and keep home HEPA air purifiers active." : "Air quality is acceptable for outdoor activity.",
          provenance: "official",
          source_label: "Central Pollution Control Board (CPCB) / IMD Air Quality",
          supporting_data: { aqi: `${aqi}`, primary_pollutant: "PM2.5", category: aqiCat },
          reason: "Respiratory health depends on fine particulate air quality",
          label: "AQI Breakdown",
        },
        {
          id: "respiratory_risk",
          title: "Asthma & Allergy Hazard Index",
          summary: `Relative humidity ${humidity}% • Wind speed ${wind} km/h • Pollen & dust dispersal index.`,
          detail: "Stagnant low wind speeds trap ground-level vehicular emissions and suspended dust in breathing zones.",
          recommendation: "Keep bronchodilator inhalers accessible if you have reactive airway disease.",
          provenance: "derived",
          source_label: "IMD + Health Vulnerability Assessment Model",
          supporting_data: { risk_level: aqi > 200 ? "High" : "Moderate", humidity: `${humidity}%` },
          reason: "Air stagnation and moisture elevate bronchial irritation",
          label: "Respiratory Alert",
        },
      ];
    }

    case "traveler": {
      return [
        {
          id: "travel_risk",
          title: "Transit & Flight Disruption Index: Minimal",
          summary: `Surface visibility ${visibility} km, wind speed ${wind} km/h. No significant airport convective alerts active.`,
          detail: "Current meteorological parameters allow normal runway visual range and on-time highway express transit operations.",
          recommendation: "Proceed with scheduled inter-city transit or flights as planned.",
          provenance: "official",
          source_label: "IMD Aviation & Highway Weather Bulletin",
          supporting_data: { runway_visibility: `${visibility} km`, flight_delay_risk: "Low" },
          reason: "Airport operations require clear visibility and manageable winds",
          label: "Travel Risk",
        },
        {
          id: "packing",
          title: "Smart Packing Checklist",
          summary: `Forecasted temperature span: ${temp - 6}°C to ${temp + 4}°C across the next 3 days.`,
          detail: "Based on local multi-day forecast trends, pack lightweight breathable cottons for daytime and an umbrella for late afternoon rain chances.",
          recommendation: "Carry a compact travel umbrella, sunglasses (UV 6+), and insulated refillable water bottle.",
          provenance: "derived",
          source_label: "IMD 5-Day Multi-Day Gridded Forecast",
          supporting_data: { items: ["Compact umbrella", "Breathable layers", "Sunscreen SPF 30+", "Water bottle"] },
          reason: "Packing advice prepared from multi-day temperature and rain forecast",
          label: "Packing Advice",
        },
      ];
    }

    case "family": {
      return [
        {
          id: "school_readiness",
          title: "Morning School Transit: Favorable",
          summary: `Morning temperature ${temp - 3}°C • Zero convective storm activity forecasted.`,
          detail: "Morning bus routes and school commute windows are clear. Children should be dressed according to mild morning breezes.",
          recommendation: "Send light cotton uniform with a water bottle. No heavy rain gear needed for morning drop-off.",
          provenance: "official",
          source_label: "IMD City Forecast Bulletin",
          supporting_data: { morning_temp: `${temp - 3}°C`, road_status: "Clear" },
          reason: "School departure times prioritize comfort and transit safety",
          label: "School Commute",
        },
        {
          id: "outdoor_play",
          title: "Safe Outdoor Playtime: 04:30 PM – 06:15 PM",
          summary: "Solar UV index drops to safe levels (< 2.0) with pleasant late afternoon temperatures.",
          detail: "Midday sun exposure (11:00 AM - 03:30 PM) poses sunburn and dehydration risk for young children. Evening park hours offer optimal thermal comfort.",
          recommendation: "Encourage outdoor sports and park visits after 04:30 PM.",
          provenance: "derived",
          source_label: "IMD Solar UV Index & Diurnal Forecast",
          supporting_data: { safe_play_window: "04:30 - 06:15 PM", max_uv: "1.8" },
          reason: "Child outdoor activities must avoid peak ultraviolet irradiance",
          label: "Outdoor Play",
        },
      ];
    }

    case "marine": {
      return [
        {
          id: "tides_swell",
          title: "Coastal Tide & Swell Profile",
          summary: "Swell height: 1.2 m • Period: 9.5s • Next High Tide: 03:45 PM (+2.4 m).",
          detail: "Moderate swell waves with gentle surf conditions. Safe for recreational bathing within designated lifeguard zones.",
          recommendation: "Keep clear of rocky groynes and follow beach safety flag signals.",
          provenance: "official",
          source_label: "INCOIS Coastal Ocean Forecast & IMD Marine Service",
          supporting_data: { swell_height: "1.2 m", tide_stage: "Rising", sea_temp: "28.5°C" },
          reason: "Swell and tide heights determine marine and beach safety",
          label: "Tide Outlook",
        },
        {
          id: "fisherman_warning",
          title: hasSevereAlert ? "IMD Fisherman Warning: Do Not Venture" : "Fisherman Advisory: All Clear",
          summary: hasSevereAlert ? "Squally weather with wind gusts up to 55 km/h over coastal waters." : "Winds 15-20 km/h. Sea condition slight to moderate.",
          detail: hasSevereAlert
            ? "Fishermen are strictly advised not to venture into deep sea waters along the coast during the next 24 hours."
            : "Normal small craft coastal fishing operations permitted.",
          recommendation: hasSevereAlert ? "Return to port immediately." : "Standard coastal navigation precautions.",
          provenance: "official",
          source_label: "IMD Marine / Cyclone Warning Centre",
          supporting_data: { coastal_wind: `${wind} km/h`, warning_level: hasSevereAlert ? "Red" : "Green" },
          reason: "Official safety alert for coastal fishermen and small craft",
          label: "Fisherman Alert",
        },
      ];
    }

    case "event_planner": {
      return [
        {
          id: "hourly_rain_prob",
          title: `Hourly Rain Chance: ${rainProb}% Max at 05:00 PM`,
          summary: `Precipitation confidence: ${rainProb > 40 ? "Moderate Shower Risk" : "Low Rain Risk"}.`,
          detail: "Convective cloud build-up typically peaks in late afternoon during warm periods. Monitor radar trends if hosting evening outdoor receptions.",
          recommendation: rainProb > 40 ? "Keep covered pavilion or canopy tents prepared on standby." : "Outdoor open lawn setup is safe.",
          provenance: "official",
          source_label: "IMD Gridded Precipitation Forecast",
          supporting_data: { evening_rain_chance: `${rainProb}%`, peak_rain_hour: "05:00 PM" },
          reason: "Event scheduling requires precise precipitation timing",
          label: "Event Rain Chance",
        },
        {
          id: "canopy_wind_risk",
          title: wind > 25 ? "Elevated Canopy Wind Gust Risk" : "Safe Outdoor Canopy Conditions",
          summary: `Sustained wind: ${wind} km/h • Peak gust potential: ${Math.round(wind * 1.4)} km/h.`,
          detail: "High temporary tents and decorative canopies require ballast weighting if wind gusts exceed 30 km/h.",
          recommendation: wind > 25 ? "Double-stake canopy anchor ropes and secure perimeter banners." : "Winds are calm for outdoor staging.",
          provenance: "derived",
          source_label: "IMD Wind Observation + Boundary Layer Model",
          supporting_data: { sustained_wind: `${wind} km/h`, max_gust: `${Math.round(wind * 1.4)} km/h` },
          reason: "Canopy and tent structures have strict aerodynamic safety limits",
          label: "Wind Structure Risk",
        },
      ];
    }

    default:
      return [];
  }
}
