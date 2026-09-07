"use client";

import { useRouter } from "next/navigation";
import { MapPin, Satellite, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { LocationSearch } from "@/components/location/LocationSearch";

const SatelliteWeatherMap = dynamic(
  () => import("@/components/map/SatelliteWeatherMap").then((m) => m.SatelliteWeatherMap),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-[640px] w-full overflow-hidden rounded-3xl border border-white/10 bg-navy-950/80 animate-shimmer flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Satellite className="h-5 w-5 animate-pulse" />
          </div>
          <p className="text-xs font-medium text-mist-300">Initializing 2D/3D Weather Cockpit...</p>
        </div>
      </div>
    ),
  }
);
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import type { LocationSearchResult } from "@/lib/types";

const POPULAR_CITIES: LocationSearchResult[] = [
  { name: "New Delhi", country: "India", admin1: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", country: "India", admin1: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru", country: "India", admin1: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Chennai", country: "India", admin1: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Kolkata", country: "India", admin1: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Hyderabad", country: "India", admin1: "Telangana", lat: 17.385, lon: 78.4867 },
  { name: "Goa", country: "India", admin1: "Goa", lat: 15.2993, lon: 74.124 },
  { name: "Shimla", country: "India", admin1: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
];

export default function ExplorePage() {
  const router = useRouter();
  const { setLocation, location } = useLocation();
  const { t } = useLanguage();

  const handleSelect = (loc: LocationSearchResult) => {
    setLocation(loc);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      {/* Page Header with Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-semibold text-mist-100">Live Satellite & Radar Map</h1>
          </div>
          <p className="mt-1 text-sm text-mist-400">
            Real-time Doppler precipitation, satellite cloud imagery, and 3D terrain elevation for {location.name}
          </p>
        </div>

        <div className="w-full sm:w-80">
          <LocationSearch autoFocus onSelect={handleSelect} placeholder={t("explore.search")} />
        </div>
      </div>

      {/* Interactive 2D / 3D Satellite Map Viewer */}
      <SatelliteWeatherMap height="640px" />

      {/* Popular Cities Grid */}
      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-mist-400">
          {t("explore.popular")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => handleSelect(city)}
              className={`glass glass-hover flex items-center gap-2.5 rounded-2xl p-3.5 text-left transition-all ${
                location.name === city.name
                  ? "border-sky-400/50 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                  : ""
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-sky-400 shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-mist-100">{city.name}</p>
                <p className="truncate text-xs text-mist-400">{city.admin1}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
