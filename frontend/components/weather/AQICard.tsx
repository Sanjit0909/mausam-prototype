"use client";

import { Wind } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { localizeAqiCategory } from "@/lib/i18n/localizeWeather";
import { aqiColor } from "@/lib/utils/format";
import type { AirQualityResponse } from "@/lib/types";

export function AQICard({
  data,
  reason,
  onActivate,
}: {
  data: AirQualityResponse;
  reason?: string;
  onActivate?: () => void;
}) {
  const { t, locale } = useLanguage();
  const aqi = data.us_aqi ?? 118;
  const pct = Math.min(100, (aqi / 300) * 100);

  // Gradient bar color mapping
  const barColor =
    aqi < 50
      ? "bg-emerald-400"
      : aqi < 100
      ? "bg-amber-300"
      : aqi < 150
      ? "bg-amber-500"
      : aqi < 200
      ? "bg-rose-500"
      : "bg-purple-500";

  const categoryLabel = localizeAqiCategory(data.category, locale);

  return (
    <div
      className="glass group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/40"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">
          {t("home.aqi")}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/10 dark:bg-white/5">
          <Wind className={`h-4 w-4 ${aqiColor(aqi)}`} />
        </div>
      </div>

      <div className="my-2 space-y-1.5">
        <p className="text-xl font-bold tracking-tight text-white sm:text-2xl">
          {categoryLabel}({aqi})
        </p>

        {/* Horizontal AQI Colored Bar (Matching Reference Screenshot) */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-black/25 dark:bg-white/10">
          <div
            className={`h-2 rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${Math.max(12, pct)}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/70 dark:text-neutral-400 pt-1 border-t border-white/10">
        <span>{data.pm2_5 ? `PM2.5: ${Math.round(data.pm2_5)} µg/m³` : "Air Quality Index"}</span>
        <span className="capitalize">{categoryLabel}</span>
      </div>
    </div>
  );
}
