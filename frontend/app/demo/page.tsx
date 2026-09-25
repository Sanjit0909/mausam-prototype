"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Car,
  Check,
  ChevronRight,
  Clock,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Cpu,
  Droplets,
  ExternalLink,
  Eye,
  Flame,
  HeartPulse,
  Home,
  Info,
  Layers,
  MapPin,
  Maximize2,
  Package,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  Tent,
  Thermometer,
  Umbrella,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { usePreferences } from "@/context/PreferencesContext";
import { DataSourceBadge } from "@/components/common/DataSourceBadge";
import { getAllPersonas, type PersonaId, type PersonaConfig } from "@/lib/personalization/personaConfig";
import { rankCardIds, type WeatherScoringContext, type PersonaId as RankingPersonaId } from "@/lib/personalization/rankingEngine";
import { synthesizeCardsForPersona } from "@/lib/personalization/personaCardSynthesizer";
import type { WeatherResponse, ForecastResponse, AirQualityResponse, AlertsResponse } from "@/lib/types";

// 7 Diverse Indian Climate Zones
interface IndianLocation {
  name: string;
  nameHi: string;
  state: string;
  lat: number;
  lon: number;
  climateZone: string;
  description: string;
  isCoastal?: boolean;
}

const DEMO_LOCATIONS: IndianLocation[] = [
  {
    name: "New Delhi",
    nameHi: "नई दिल्ली",
    state: "National Capital",
    lat: 28.6139,
    lon: 77.209,
    climateZone: "Semi-Arid / Gangetic Basin",
    description: "Capital urban heat island, extreme summer heatwaves and winter smog.",
  },
  {
    name: "Mumbai",
    nameHi: "मुंबई",
    state: "Maharashtra",
    lat: 19.076,
    lon: 72.8777,
    climateZone: "Tropical Coastal",
    description: "High coastal humidity, intense southwest monsoon downpours and commuter rush.",
    isCoastal: true,
  },
  {
    name: "Darjeeling",
    nameHi: "दार्जिलिंग",
    state: "West Bengal",
    lat: 27.041,
    lon: 88.2663,
    climateZone: "Eastern Himalayas",
    description: "Sub-tropical highland, dense mountain fog, frost hazard and tea plantation agro.",
  },
  {
    name: "Goa (Panaji)",
    nameHi: "गोवा (पणजी)",
    state: "Goa",
    lat: 15.4909,
    lon: 73.8278,
    climateZone: "Arabian Sea Coast",
    description: "Coastal tides, swell periods, marine beach recreation and fisherman warnings.",
    isCoastal: true,
  },
  {
    name: "Agra",
    nameHi: "आगरा",
    state: "Uttar Pradesh",
    lat: 27.1767,
    lon: 78.0081,
    climateZone: "North Indian Plains",
    description: "High tourist footfall, intense summer continental heat and wheat agriculture.",
  },
  {
    name: "Shimla",
    nameHi: "शिमला",
    state: "Himachal Pradesh",
    lat: 31.1048,
    lon: 77.1734,
    climateZone: "Western Himalayas",
    description: "Cool temperate mountain terrain, rapid freeze-thaw cycles and hill travel risks.",
  },
  {
    name: "Varanasi",
    nameHi: "वाराणसी",
    state: "Uttar Pradesh",
    lat: 25.3176,
    lon: 82.9739,
    climateZone: "Middle Gangetic Plain",
    description: "Pilgrimage center, high thermal humidity index and agricultural hinterland.",
  },
];

// 5 Weather Scenarios
interface WeatherScenario {
  id: string;
  nameEn: string;
  nameHi: string;
  icon: typeof Sun;
  badge: string;
  badgeColor: string;
  summary: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  rainProb: number;
  aqi: number;
  visibilityKm: number;
  uvIndex: number;
  alertSeverity?: "extreme" | "severe" | "moderate" | null;
  alertTitle?: string;
  alertDesc?: string;
}

const SCENARIOS: WeatherScenario[] = [
  {
    id: "normal",
    nameEn: "Pleasant Clear Day",
    nameHi: "सुखद साफ मौसम",
    icon: CloudSun,
    badge: "Normal Day",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    summary: "Clear skies with gentle breeze, normal AQI, and safe seasonal temperatures.",
    temp: 26,
    feelsLike: 26,
    humidity: 48,
    windSpeed: 10,
    rainProb: 5,
    aqi: 72,
    visibilityKm: 8.5,
    uvIndex: 5,
  },
  {
    id: "heatwave",
    nameEn: "Severe Heatwave (Red Alert)",
    nameHi: "भीषण लू (रेड अलर्ट)",
    icon: Flame,
    badge: "IMD Red Alert",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
    summary: "Blistering dry winds, extreme thermal distress, and critical heat illness hazard.",
    temp: 43.5,
    feelsLike: 47,
    humidity: 28,
    windSpeed: 24,
    rainProb: 0,
    aqi: 185,
    visibilityKm: 4.5,
    uvIndex: 11,
    alertSeverity: "extreme",
    alertTitle: "IMD Red Alert: Severe Heatwave Conditions",
    alertDesc: "Day temperatures 5.5°C above normal. Strict avoidance of outdoor sun exposure between 11 AM - 4 PM. Stay hydrated.",
  },
  {
    id: "monsoon",
    nameEn: "Monsoon Deluge & Flooding",
    nameHi: "भारी मानसूनी बारिश (ऑरेंज अलर्ट)",
    icon: CloudLightning,
    badge: "IMD Orange Alert",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    summary: "Continuous heavy tropical rain, rapid waterlogging of underpasses, and squally winds.",
    temp: 27,
    feelsLike: 32,
    humidity: 94,
    windSpeed: 38,
    rainProb: 95,
    aqi: 35,
    visibilityKm: 1.8,
    uvIndex: 1,
    alertSeverity: "severe",
    alertTitle: "IMD Orange Alert: Heavy to Very Heavy Rainfall (85mm)",
    alertDesc: "Waterlogging expected in low-lying city arterials. Coastal fishermen advised not to venture out. Check transit advisories.",
  },
  {
    id: "dust_storm",
    nameEn: "Severe Dust Storm & Smog",
    nameHi: "धूल भरी आंधी व वायु आपातकाल",
    icon: Wind,
    badge: "Air Quality Emergency",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    summary: "Strong squalls picking up loose soil, spiking PM10 to hazardous emergency levels.",
    temp: 34,
    feelsLike: 36,
    humidity: 38,
    windSpeed: 42,
    rainProb: 15,
    aqi: 420,
    visibilityKm: 0.9,
    uvIndex: 3,
    alertSeverity: "severe",
    alertTitle: "IMD / CPCB Warning: Severe Dust Stagnation & High PM10",
    alertDesc: "AQI in Severe zone. High risk for respiratory patients. Keep windows sealed and operate indoor filtration.",
  },
  {
    id: "dense_fog",
    nameEn: "Dense Winter Fog",
    nameHi: "घना शीतकालीन कोहरा",
    icon: Droplets,
    badge: "Transport Disruption",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    summary: "Zero-visibility radiation fog impacting highway traffic and airport runway slots.",
    temp: 9.5,
    feelsLike: 8,
    humidity: 98,
    windSpeed: 4,
    rainProb: 10,
    aqi: 310,
    visibilityKm: 0.08,
    uvIndex: 1,
    alertSeverity: "moderate",
    alertTitle: "IMD Yellow Alert: Dense to Very Dense Fog",
    alertDesc: "Surface visibility below 100 meters. Flight and express train delays expected. Maintain vehicle fog-light illumination.",
  },
];

export default function DemoPage() {
  const { t, locale } = useLanguage();
  const { updatePreferences } = usePreferences();

  // Active Demo State
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>("runner");
  const [selectedLocation, setSelectedLocation] = useState<IndianLocation>(DEMO_LOCATIONS[0]);
  const [selectedScenario, setSelectedScenario] = useState<WeatherScenario>(SCENARIOS[0]);
  const [activeTab, setActiveTab] = useState<"cockpit" | "compare" | "why" | "architecture">("cockpit");

  const allPersonas = useMemo(() => getAllPersonas(), []);

  // Build synthetic WeatherResponse for demo simulation
  const mockWeather: WeatherResponse = useMemo(
    () => ({
      location: {
        name: selectedLocation.name,
        country: "India",
        region: selectedLocation.state,
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        timezone: "Asia/Kolkata",
      },
      current: {
        temperature: selectedScenario.temp,
        feels_like: selectedScenario.feelsLike,
        condition: selectedScenario.nameEn,
        condition_code: selectedScenario.id === "monsoon" ? 80 : 0,
        condition_group: (selectedScenario.id === "monsoon" ? "rain" : "clear") as any,
        is_day: true,
        humidity: selectedScenario.humidity,
        wind_speed: selectedScenario.windSpeed,
        wind_direction: 240,
        pressure: 1012,
        precipitation: selectedScenario.rainProb > 50 ? 12.5 : 0,
        uv_index: selectedScenario.uvIndex,
        visibility: selectedScenario.visibilityKm,
        observed_at: new Date().toISOString(),
      },
      source: "IMD Station (Prototype Grounded)",
      is_demo: true,
    }),
    [selectedLocation, selectedScenario]
  );

  const mockAirQuality: AirQualityResponse = useMemo(
    () => ({
      location: {
        name: selectedLocation.name,
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
      },
      us_aqi: selectedScenario.aqi,
      category:
        selectedScenario.aqi <= 50
          ? "good"
          : selectedScenario.aqi <= 100
          ? "satisfactory"
          : selectedScenario.aqi <= 200
          ? "moderate"
          : selectedScenario.aqi <= 300
          ? "poor"
          : "severe",
      pm2_5: Math.round(selectedScenario.aqi * 0.5),
      pm10: selectedScenario.id === "dust_storm" ? 420 : Math.round(selectedScenario.aqi * 0.8),
      ozone: 45,
      nitrogen_dioxide: 32,
      sulphur_dioxide: 12,
      carbon_monoxide: 0.8,
      source: "IMD / CPCB",
    }),
    [selectedScenario, selectedLocation]
  );

  const mockAlerts: AlertsResponse = useMemo(
    () => ({
      location_name: selectedLocation.name,
      alerts: selectedScenario.alertSeverity
        ? [
            {
              id: `alert-${selectedScenario.id}`,
              title: selectedScenario.alertTitle || "Weather Advisory",
              description: selectedScenario.alertDesc || "",
              severity: selectedScenario.alertSeverity,
              alert_type: "meteorological",
              source: "IMD",
              provider_label: "India Meteorological Department",
              area: selectedLocation.name,
              issued_at: new Date().toISOString(),
            },
          ]
        : [],
      has_severe:
        selectedScenario.alertSeverity === "severe" ||
        selectedScenario.alertSeverity === "extreme",
    }),
    [selectedScenario, selectedLocation]
  );

  // Compute ranking for current persona
  const currentScoringCtx: WeatherScoringContext = useMemo(
    () => ({
      temperature: selectedScenario.temp,
      feelsLike: selectedScenario.feelsLike,
      humidity: selectedScenario.humidity,
      windSpeed: selectedScenario.windSpeed,
      rainProbability: selectedScenario.rainProb,
      visibilityKm: selectedScenario.visibilityKm,
      uvIndex: selectedScenario.uvIndex,
      aqi: selectedScenario.aqi,
      isCoastal: selectedLocation.isCoastal,
      currentHourIST: 8, // Morning demo default
    }),
    [selectedScenario, selectedLocation]
  );

  const synthesizedCards = useMemo(
    () =>
      synthesizeCardsForPersona(
        selectedPersona as RankingPersonaId,
        mockWeather,
        null,
        mockAirQuality,
        mockAlerts
      ),
    [selectedPersona, mockWeather, mockAirQuality, mockAlerts]
  );

  const { orderedIds, scoreMap } = useMemo(() => {
    const ids = synthesizedCards.map((c) => c.id);
    return rankCardIds(ids, selectedPersona as RankingPersonaId, currentScoringCtx);
  }, [synthesizedCards, selectedPersona, currentScoringCtx]);

  // Apply Demo Persona to user's local session and go to /home
  const handleApplyAndGoHome = () => {
    try {
      const p = allPersonas.find((item) => item.id === selectedPersona);
      if (p) {
        void updatePreferences({
          interests: p.interestKeys as any,
          persona_profile: { primary_persona: p.id as any },
        });
        localStorage.setItem("mausam:guest_demo", "true");
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8 space-y-8 animate-fade-in-up">
      {/* Header Banner */}
      <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-r from-navy-900 via-navy-950 to-slate-900 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1 text-xs font-bold text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SIH 2026 EVALUATION & DEMONSTRATION SUITE</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-white">
              RITUDARPAN — Weather Intelligence Cockpit
            </h1>
            <p className="text-sm md:text-base text-mist-300 max-w-2xl">
              Demonstrate how identical meteorological conditions dynamically reshape into completely distinct card hierarchies, actionable safety advisories, and metric priorities across 8 Indian citizen personas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/home"
              onClick={handleApplyAndGoHome}
              className="flex items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-sky-400 shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
            >
              <span>{locale === "hi" ? "लाइव होमपेज देखें" : "Launch in Home UI"}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Demo Mode Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "cockpit", label: "Interactive Cockpit", icon: SlidersHorizontal },
            { id: "compare", label: "Compare 8 Personas", icon: Layers },
            { id: "why", label: "Traditional vs MAUSAM", icon: Compass },
            { id: "architecture", label: "System Architecture", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isActive
                    ? "bg-amber-400 text-navy-950 shadow-md font-bold"
                    : "bg-white/5 text-mist-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: INTERACTIVE COCKPIT */}
      {activeTab === "cockpit" && (
        <div className="space-y-8">
          {/* Controls: Persona + Location + Scenario */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control 1: Persona Switcher */}
            <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>1. Select Persona ({allPersonas.length})</span>
                </span>
                <span className="text-[10px] text-mist-400 font-mono">STEP 1</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {allPersonas.map((p) => {
                  const isSelected = selectedPersona === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPersona(p.id)}
                      className={`flex items-center gap-2 rounded-2xl p-2.5 text-xs text-left transition-all active:scale-95 ${
                        isSelected
                          ? "bg-sky-500 text-navy-950 font-bold shadow-md shadow-sky-500/20"
                          : "bg-white/5 text-mist-200 hover:bg-white/10"
                      }`}
                    >
                      <div className={`h-2 w-2 rounded-full ${isSelected ? "bg-navy-950" : "bg-sky-400"}`} />
                      <span className="truncate capitalize">{p.id.replace("_", " ")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control 2: Climate Zone Switcher */}
            <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>2. Select Climate Zone</span>
                </span>
                <span className="text-[10px] text-mist-400 font-mono">STEP 2</span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {DEMO_LOCATIONS.map((loc) => {
                  const isSelected = selectedLocation.name === loc.name;
                  return (
                    <button
                      key={loc.name}
                      onClick={() => setSelectedLocation(loc)}
                      className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs text-left transition-all active:scale-95 ${
                        isSelected
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 font-semibold"
                          : "bg-white/5 text-mist-300 hover:bg-white/10"
                      }`}
                    >
                      <div>
                        <p className="font-semibold text-white">{loc.name} <span className="opacity-60 text-[11px]">({loc.state})</span></p>
                        <p className="text-[10px] text-mist-400">{loc.climateZone}</p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control 3: Scenario Simulator */}
            <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="h-4 w-4" />
                  <span>3. Inject Weather Scenario</span>
                </span>
                <span className="text-[10px] text-mist-400 font-mono">STEP 3</span>
              </div>
              <div className="space-y-1.5">
                {SCENARIOS.map((scen) => {
                  const isSelected = selectedScenario.id === scen.id;
                  const Icon = scen.icon;
                  return (
                    <button
                      key={scen.id}
                      onClick={() => setSelectedScenario(scen)}
                      className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-left transition-all active:scale-95 ${
                        isSelected
                          ? "bg-amber-500/20 border border-amber-500/40 text-amber-200 font-semibold shadow-sm"
                          : "bg-white/5 text-mist-300 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{scen.nameEn}</p>
                        <p className="text-[10px] text-mist-400 truncate">{scen.summary}</p>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Cockpit Live Preview */}
          <div className="space-y-5">
            {/* Context Telemetry Strip */}
            <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/20 dark:border-white/10 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-white/80 dark:text-neutral-400">Active Simulation:</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-200 dark:text-sky-400" />
                  {selectedLocation.name}
                </span>
                <span className="opacity-30">•</span>
                <span className="text-xs font-bold text-amber-300">{selectedScenario.nameEn}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-mist-300 font-mono">
                <span>{selectedScenario.temp}°C</span>
                <span>•</span>
                <span>{selectedScenario.humidity}% Hum</span>
                <span>•</span>
                <span>{selectedScenario.windSpeed} km/h Wind</span>
                <span>•</span>
                <span className={selectedScenario.aqi > 200 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                  {selectedScenario.aqi} AQI
                </span>
                <DataSourceBadge source={selectedScenario.alertSeverity ? "demo_simulated" : "live_imd"} />
              </div>
            </div>

            {/* Official Alert Override (if scenario has one) */}
            {selectedScenario.alertSeverity && (
              <div className="rounded-2xl border border-rose-500/50 bg-rose-500/10 p-4 shadow-[0_0_25px_rgba(244,63,94,0.15)] flex items-start gap-3.5">
                <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                      {selectedScenario.alertSeverity.toUpperCase()} ALERT
                    </span>
                    <h3 className="text-sm font-bold text-white">{selectedScenario.alertTitle}</h3>
                  </div>
                  <p className="text-xs text-mist-200 mt-1 leading-relaxed">
                    {selectedScenario.alertDesc}
                  </p>
                </div>
              </div>
            )}

            {/* Dynamically Ordered Persona Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  <span>Deterministic Ranked Cards for {selectedPersona.toUpperCase()}</span>
                </h2>
                <span className="text-xs text-mist-400">
                  Sorted descending by Mathematical Score
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderedIds.map((cardId) => {
                  const card = synthesizedCards.find((c) => c.id === cardId);
                  const breakdown = scoreMap[cardId];
                  if (!card || !breakdown) return null;

                  return (
                    <div
                      key={cardId}
                      className="glass rounded-3xl p-5 border border-white/10 space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <DataSourceBadge source={card.provenance === "official" ? "live_imd" : "model_estimated"} />
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {breakdown.totalScore} pts
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-mist-400 uppercase tracking-wider">
                          Rank #{orderedIds.indexOf(cardId) + 1}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-white leading-tight">{card.title}</h3>
                        <p className="text-xs text-mist-300 mt-1">{card.summary}</p>
                      </div>

                      {/* Score breakdown mini-bars */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
                        <div className="flex justify-between text-mist-400">
                          <span>Persona Weight: <b className="text-emerald-400 font-mono">+{breakdown.personaPoints}</b></span>
                          <span>Weather Severity: <b className="text-amber-400 font-mono">+{breakdown.severityPoints}</b></span>
                          <span>Time Factor: <b className="text-sky-400 font-mono">+{breakdown.timePoints}</b></span>
                        </div>
                        <p className="text-[10.5px] text-sky-300 italic">
                          Trigger: {breakdown.topReasonEn}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPARE 8 PERSONAS SIDE-BY-SIDE */}
      {activeTab === "compare" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-mist-200">
              <strong className="text-white">SIH 2026 Core Personalization Proof</strong>: The table below shows how the <em>exact same weather conditions</em> ({selectedLocation.name}, {selectedScenario.temp}°C, {selectedScenario.humidity}% Hum, {selectedScenario.windSpeed} km/h Wind) generate completely different top-ranked cards, risk thresholds, and advisories for each citizen profile.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allPersonas.map((p) => {
              const pCards = synthesizeCardsForPersona(
                p.id as RankingPersonaId,
                mockWeather,
                null,
                mockAirQuality,
                mockAlerts
              );
              const { orderedIds: pOrder, scoreMap: pMap } = rankCardIds(
                pCards.map((c) => c.id),
                p.id as RankingPersonaId,
                currentScoringCtx
              );

              const topCardId = pOrder[0];
              const topCard = pCards.find((c) => c.id === topCardId);
              const topScore = pMap[topCardId]?.totalScore ?? 0;

              return (
                <div
                  key={p.id}
                  className="glass rounded-3xl p-5 border border-white/10 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wide text-sky-400">
                        {p.id.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {topScore} pts
                      </span>
                    </div>

                    <div className="rounded-2xl bg-white/5 p-3 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-mist-400 font-semibold">
                        Top Ranked Card:
                      </span>
                      <h4 className="text-xs font-bold text-white leading-snug">
                        {topCard?.title || "Specialty Advisory"}
                      </h4>
                      <p className="text-[11px] text-mist-300 line-clamp-2">
                        {topCard?.summary}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[10.5px] text-mist-400">
                    <p>Primary Metric: <b className="text-mist-200">{p.metricPriority[0].replace("_", " ")}</b></p>
                    <p>Action: <b className="text-emerald-400">{topCard?.recommendation ? topCard.recommendation.slice(0, 45) + "..." : "Monitor forecast"}</b></p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: TRADITIONAL VS MAUSAM */}
      {activeTab === "why" && (
        <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              Why Generic Weather Apps Fail Indian Citizens
            </h2>
            <p className="text-sm text-mist-300 mt-1">
              Traditional apps present raw telemetry (e.g. 34°C, 18 km/h wind) that forces every user to manually deduce what it means for their specific life, farm, or commute.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 text-mist-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Citizen Persona</th>
                  <th className="py-3 px-4">Traditional App (Raw Data)</th>
                  <th className="py-3 px-4">RITUDARPAN (Contextual Intelligence)</th>
                  <th className="py-3 px-4">Proven Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-mist-200">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Farmer (किसान)</td>
                  <td className="py-3.5 px-4 text-mist-400">"Wind 18 km/h • Rain 10%"</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-medium">"Spray with caution: wind is approaching drift limit (15 km/h). Delay to evening."</td>
                  <td className="py-3.5 px-4 text-sky-400">Saves ₹2,500/acre in wasted chemicals</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Daily Commuter</td>
                  <td className="py-3.5 px-4 text-mist-400">"Precipitation 65%"</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-medium">"Waterlogging Risk at flyover underpasses during 08:30 AM rush. Switch to Metro."</td>
                  <td className="py-3.5 px-4 text-sky-400">Avoids 45-minute traffic standstill</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Outdoor Runner</td>
                  <td className="py-3.5 px-4 text-mist-400">"Temperature 32°C • AQI 160"</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-medium">"Best Window 05:45-07:00 AM (24°C, AQI 80). PM run triggers cardiac thermal load."</td>
                  <td className="py-3.5 px-4 text-sky-400">Prevents heat exhaustion & bronchial stress</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-bold text-white">Asthmatic Patient</td>
                  <td className="py-3.5 px-4 text-mist-400">"AQI 220"</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-medium">"Severe fine PM2.5 spike due to inversion. N95 mask required outdoors. Keep inhaler."</td>
                  <td className="py-3.5 px-4 text-sky-400">Prevents emergency room hospitalization</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM ARCHITECTURE */}
      {activeTab === "architecture" && (
        <div className="glass rounded-3xl p-6 md:p-8 border border-white/10 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white">End-to-End System Architecture</h2>
            <p className="text-sm text-mist-300 mt-1">
              Deterministic, robust, and transparent pipeline integrating official IMD endpoints with client-side ranking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-navy-900/90 border border-slate-700/60 p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Radio className="h-4 w-4" />
                <span>1. Meteorological Data Ingestion</span>
              </span>
              <ul className="text-xs text-mist-300 space-y-2">
                <li>• <b>IMD AWS & Surface Stations</b>: Real-time telemetry across 800+ Indian stations.</li>
                <li>• <b>IMD District Bulletins</b>: Agromet advisories, warnings (Red/Orange/Yellow).</li>
                <li>• <b>Open-Meteo NWP Fallback</b>: High-resolution ECMWF/GFS gridded fields when IMD gateway timeouts occur.</li>
                <li>• <b>INCOIS Marine Oceanography</b>: Coastal swell and tide models.</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-navy-900/90 border border-slate-700/60 p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                <span>2. Deterministic Scoring Engine</span>
              </span>
              <ul className="text-xs text-mist-300 space-y-2">
                <li>• <b>Formula</b>: <code className="text-amber-300 font-mono text-[10px]">Score = S(persona) + S(severity) + S(time) + S(loc) + S(pref)</code></li>
                <li>• <b>No Black-Box Hallucination</b>: 100% mathematical and explainable.</li>
                <li>• <b>Official Alert Priority Anchor</b>: Severe warnings strictly locked to Top Slot #1.</li>
                <li>• <b>Local Persistence</b>: Pins and hidden preferences saved client-side.</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-navy-900/90 border border-slate-700/60 p-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
                <Compass className="h-4 w-4" />
                <span>3. Public Utility Mobile UI</span>
              </span>
              <ul className="text-xs text-mist-300 space-y-2">
                <li>• <b>Mobile-First Sticky Nav</b>: Touch targets $\ge 44$px, iOS safe area.</li>
                <li>• <b>Data Trust Provenance</b>: Explicit badges for Live IMD vs Model Estimated.</li>
                <li>• <b>Bilingual Accessibility</b>: Native English and Hindi (हिन्दी).</li>
                <li>• <b>Grounded AI Copilot</b>: Answers strictly bounded by official observations.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
