"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/common/LoadingSkeleton";

import { Satellite } from "lucide-react";

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
import { LocationSearch } from "@/components/location/LocationSearch";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";

export default function MapPage() {
  const { location, setLocation } = useLocation();
  const { t } = useLanguage();

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-mist-100 flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Interactive Weather & Satellite Map
          </h1>
          <p className="text-xs text-mist-400">
            2D Flat Map & 3D Globe / Terrain Toggle · Doppler Radar & Cloud Cover
          </p>
        </div>
        <div className="w-full sm:w-72">
          <LocationSearch onSelect={setLocation} placeholder={t("explore.search")} />
        </div>
      </div>

      <SatelliteWeatherMap height="calc(100vh - 13rem)" />
    </div>
  );
}
