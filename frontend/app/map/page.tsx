"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/common/LoadingSkeleton";

const SatelliteWeatherMap = dynamic(
  () => import("@/components/map/SatelliteWeatherMap").then((m) => m.SatelliteWeatherMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[640px] w-full rounded-3xl bg-navy-900/60 border border-white/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          <p className="text-xs text-mist-400">Loading satellite terrain & radar viewer...</p>
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
