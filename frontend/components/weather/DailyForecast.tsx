"use client";

import Link from "next/link";
import { ChevronRight, Droplets } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useLanguage } from "@/context/LanguageContext";
import { formatDayLabel, formatPercent, formatTemp } from "@/lib/utils/format";
import type { DailyPoint } from "@/lib/types";

interface DailyForecastProps {
  daily: DailyPoint[];
}

export function DailyForecast({ daily }: DailyForecastProps) {
  const { t, locale } = useLanguage();
  if (!daily.length) return null;

  const maxTemp = Math.max(...daily.map((d) => d.temp_max));
  const minTemp = Math.min(...daily.map((d) => d.temp_min));
  const range = Math.max(maxTemp - minTemp, 1);

  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 bg-white/[0.22] dark:bg-transparent border-white/40 dark:border-white/10 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">
          {locale === "hi" ? "दैनिक पूर्वानुमान" : "Daily Forecast"}
        </h3>
        <span className="text-xs font-medium text-white/85 dark:text-neutral-400">
          {daily.length} {locale === "hi" ? "दिन" : "days"}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/15 dark:divide-white/5">
        {daily.map((day, i) => {
          const leftPct = Math.max(0, Math.min(100, ((day.temp_min - minTemp) / range) * 100));
          const widthPct = Math.max(8, Math.min(100, ((day.temp_max - day.temp_min) / range) * 100));
          const dayLabel =
            i === 0 ? t("home.today") : i === 1 ? t("home.tomorrow") : formatDayLabel(day.date, i, locale);

          return (
            <div key={day.date} className="flex items-center gap-2.5 py-3 text-sm">
              {/* Day Name */}
              <span className="w-16 shrink-0 font-bold text-white dark:text-neutral-200">
                {dayLabel}
              </span>

              {/* Rain Probability Pill */}
              <div className="w-14 shrink-0 flex items-center">
                {(day.precipitation_probability_max || 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white dark:text-sky-400">
                    <Droplets className="h-3 w-3 shrink-0 text-sky-200" />
                    <span>{formatPercent(day.precipitation_probability_max)}</span>
                  </span>
                ) : (
                  <span className="w-8 text-[11px] font-medium text-white/40 dark:text-neutral-600">--</span>
                )}
              </div>

              {/* Weather Condition Icon */}
              <div className="w-8 shrink-0 flex justify-center">
                <WeatherIcon
                  group={day.condition_group}
                  className="h-5 w-5 text-white dark:text-sky-300 drop-shadow-sm"
                />
              </div>

              {/* Min Temperature */}
              <span className="w-9 shrink-0 text-right text-xs font-bold text-white/85 dark:text-neutral-400">
                {formatTemp(day.temp_min)}
              </span>

              {/* Temperature Min-Max Range Bar */}
              <div className="relative h-2 flex-1 rounded-full bg-black/20 dark:bg-white/5 overflow-hidden">
                <div
                  className="absolute h-2 rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-amber-500 shadow-sm transition-all duration-500"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </div>

              {/* Max Temperature */}
              <span className="w-9 shrink-0 text-right text-sm font-bold text-white dark:text-white">
                {formatTemp(day.temp_max)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer link matching screenshot ("15-day forecast >") */}
      <div className="mt-3 flex items-center justify-end border-t border-white/10 pt-3">
        <Link
          href="/weather"
          className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white transition-colors dark:text-neutral-300 dark:hover:text-white"
        >
          <span>{locale === "hi" ? "विस्तृत 15-दिवसीय पूर्वानुमान" : "15-day forecast"}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
