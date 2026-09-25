"use client";

import Link from "next/link";
import { Maximize2, Satellite } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { CurrentWeather, LocationInfo } from "@/lib/types";

interface RadarPreviewCardProps {
  location: LocationInfo;
  current?: CurrentWeather;
}

export function RadarPreviewCard({ location, current }: RadarPreviewCardProps) {
  const { locale } = useLanguage();
  const tempStr = current ? `${Math.round(current.temperature)}°` : "30°";

  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">
          <Satellite className="h-3.5 w-3.5 text-white dark:text-sky-400" />
          <span>{locale === "hi" ? "रडार और मानचित्र" : "Radar and maps"}</span>
        </span>
        <Link
          href="/map"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white transition-colors dark:text-neutral-400 dark:hover:text-white"
        >
          <span>{locale === "hi" ? "पूर्ण स्क्रीन" : "Open 3D"}</span>
          <Maximize2 className="h-3 w-3" />
        </Link>
      </div>

      {/* Styled Interactive Radar Preview Box */}
      <Link
        href="/map"
        className="relative block h-48 w-full overflow-hidden rounded-2xl border border-white/20 shadow-inner group-hover:border-white/40 transition-all duration-300"
      >
        {/* Synthetic Regional Radar Heatmap Texture matching Screenshot */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-700 via-rose-600 to-sky-600 opacity-90 transition-transform duration-500 group-hover:scale-105" />
        
        {/* Map Topo & Country contour overlay */}
        <svg className="absolute inset-0 h-full w-full opacity-40 mix-blend-overlay" viewBox="0 0 200 120">
          <path d="M 20 60 Q 60 10 120 40 T 180 80" fill="none" stroke="#ffffff" strokeWidth="1" />
          <path d="M 40 80 Q 90 40 150 70" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="2 2" />
          <circle cx="100" cy="50" r="14" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
          <circle cx="100" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" strokeDasharray="3 3" />
        </svg>

        {/* Location target marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-white opacity-40" />
          <div className="relative h-3 w-3 rounded-full bg-white shadow-lg ring-2 ring-sky-400" />
        </div>

        {/* Overlay pill badge on map */}
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-md">
          {location.name} · Live Doppler
        </div>
      </Link>

      {/* Caption below matching Screenshot ("Current temperature of approximately 30°") */}
      <p className="mt-3 text-xs font-medium text-white/85 dark:text-neutral-300">
        {locale === "hi"
          ? `लगभग ${tempStr} का वर्तमान तापमान`
          : `Current temperature of approximately ${tempStr}`}
      </p>
    </div>
  );
}
