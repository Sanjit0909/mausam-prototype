"use client";

import { useMemo } from "react";
import { Sunrise, Sunset } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatTime } from "@/lib/utils/format";
import type { AstronomyResponse } from "@/lib/types";

interface SunsetArcCardProps {
  data: AstronomyResponse | null;
}

export function SunsetArcCard({ data }: SunsetArcCardProps) {
  const { t, locale } = useLanguage();

  const sunsetStr = data?.sunset
    ? formatTime(data.sunset, data.location.timezone, locale)
    : "6:14 PM";

  // Calculate sun position along 180° semi-circle arc
  const sunAngle = useMemo(() => {
    if (!data?.sunrise || !data?.sunset) return 135; // Default late afternoon position
    try {
      const now = new Date();
      const rise = new Date(data.sunrise);
      const set = new Date(data.sunset);
      const total = set.getTime() - rise.getTime();
      const current = now.getTime() - rise.getTime();
      const progress = Math.max(0, Math.min(1, current / total));
      return Math.round(progress * 180);
    } catch {
      return 135;
    }
  }, [data]);

  // Polar to Cartesian conversion for 120x60 SVG viewbox
  const radius = 48;
  const cx = 60;
  const cy = 52;
  const rad = (Math.PI * (180 - sunAngle)) / 180;
  const sunX = cx + radius * Math.cos(rad);
  const sunY = cy - radius * Math.sin(rad);

  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 bg-white/[0.22] dark:bg-transparent border-white/40 dark:border-white/10 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white dark:text-neutral-300 drop-shadow-sm">
          <Sunset className="h-4 w-4 text-amber-300" />
          <span>{locale === "hi" ? "सूर्यास्त न चूकें" : "Don't miss the sunset"}</span>
        </span>
        <span className="text-[11px] font-mono font-bold text-white/90 dark:text-neutral-400">
          {sunsetStr}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-white drop-shadow-sm">
            {locale === "hi"
              ? `सूर्यास्त ${sunsetStr} पर होगा`
              : `Sunset will be at ${sunsetStr}`}
          </p>
          <p className="mt-1 text-xs font-medium text-white/85 dark:text-neutral-400">
            {data?.sunrise
              ? `${locale === "hi" ? "सूर्योदय" : "Sunrise"}: ${formatTime(data.sunrise, data.location.timezone, locale)}`
              : "Golden hour approaching"}
          </p>
        </div>

        {/* Solar Path Arc SVG (Matching Screenshot) */}
        <div className="relative h-14 w-28 shrink-0">
          <svg viewBox="0 0 120 60" className="h-full w-full overflow-visible">
            {/* Dashed baseline horizon */}
            <line x1="8" y1="52" x2="112" y2="52" stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3 3" />
            {/* Arc trajectory */}
            <path
              d="M 12 52 A 48 48 0 0 1 108 52"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            {/* Active Sun node on arc */}
            <circle cx={sunX} cy={sunY} r="5" fill="#facc15" className="animate-pulse" />
            <circle cx={sunX} cy={sunY} r="9" fill="rgba(250, 204, 21, 0.25)" />
          </svg>
        </div>
      </div>
    </div>
  );
}
