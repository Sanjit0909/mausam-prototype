"use client";

import Link from "next/link";
import { ChevronRight, Droplets } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useLanguage } from "@/context/LanguageContext";
import { formatHourLabel, formatPercent, formatTemp } from "@/lib/utils/format";
import type { HourlyPoint } from "@/lib/types";

interface HourlyForecastProps {
  hourly: HourlyPoint[];
  summary?: string;
  limit?: number;
}

export function HourlyForecast({ hourly, summary, limit = 16 }: HourlyForecastProps) {
  const { t, locale } = useLanguage();
  const points = hourly.slice(0, limit);

  if (!points.length) return null;

  const temps = points.map((p) => p.temperature);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = Math.max(maxTemp - minTemp, 1);

  // Auto-generate a descriptive summary line if not explicitly provided
  const derivedSummary =
    summary ||
    (locale === "hi"
      ? `मुख्य रूप से साफ़। अधिकतम ${Math.round(maxTemp)}°C और न्यूनतम ${Math.round(minTemp)}°C तक।`
      : `Generally clear. Highs around ${Math.round(maxTemp)}°C and lows ${Math.round(minTemp)}°C.`);

  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 bg-white/[0.22] dark:bg-transparent border-white/40 dark:border-white/10 shadow-lg">
      {/* Header & Summary (Matching Reference Screenshot) */}
      <div className="mb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">
          {t("home.hourly")}
        </h3>
        <p className="mt-1 text-sm font-semibold text-white dark:text-neutral-200 drop-shadow-sm">
          {derivedSummary}
        </p>
      </div>

      {/* Hourly Scrollable Timeline with Temperature Curve */}
      <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-3 pt-2 no-scrollbar">
        {points.map((point, i) => {
          // Normalize height for the subtle trend curve dot
          const normHeight = ((point.temperature - minTemp) / tempRange) * 16;

          const pointHour = new Date(point.time).getHours();
          const isDay = pointHour >= 6 && pointHour < 19;

          return (
            <div
              key={point.time}
              className="flex min-w-[62px] flex-col items-center gap-2 text-center shrink-0"
            >
              <span className="text-[11px] font-semibold text-white/90 dark:text-neutral-300">
                {i === 0 ? t("home.now") : formatHourLabel(point.time, locale)}
              </span>

              <div className="flex h-7 w-7 items-center justify-center">
                <WeatherIcon
                  group={point.condition_group}
                  isDay={isDay}
                  className="h-6 w-6 text-white dark:text-sky-300 drop-shadow-md"
                />
              </div>

              {/* Dynamic Temperature Dot & Label */}
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-white tracking-tight drop-shadow-sm">
                  {formatTemp(point.temperature)}
                </span>
                {/* Visual temperature curve indicator node */}
                <div
                  className="h-1.5 w-1.5 rounded-full bg-white dark:bg-sky-400 shadow-[0_0_8px_rgba(255,255,255,0.9)] mt-1 transition-transform"
                  style={{ transform: `translateY(-${normHeight * 0.4}px)` }}
                />
              </div>

              {/* Precipitation Probability */}
              <div className="h-5 flex items-center justify-center">
                {point.precipitation_probability !== null &&
                point.precipitation_probability !== undefined &&
                point.precipitation_probability > 0 ? (
                  <span className="flex items-center gap-0.5 text-[10.5px] font-bold text-white dark:text-sky-400">
                    <Droplets className="h-3 w-3 shrink-0 text-sky-200" />
                    <span>{formatPercent(point.precipitation_probability)}</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-white/50 dark:text-neutral-600">0%</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Link (Matching Reference Screenshot: "48-hour forecast >") */}
      <div className="mt-3 flex items-center justify-end border-t border-white/10 pt-3">
        <Link
          href="/weather"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white transition-colors dark:text-neutral-300 dark:hover:text-white"
        >
          <span>{locale === "hi" ? "48-घंटे का पूर्वानुमान" : "48-hour forecast"}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
