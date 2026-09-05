"use client";

import { Droplets } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useLanguage } from "@/context/LanguageContext";
import { formatHourLabel, formatPercent, formatTemp } from "@/lib/utils/format";
import type { HourlyPoint } from "@/lib/types";

interface HourlyForecastProps {
  hourly: HourlyPoint[];
  limit?: number;
}

export function HourlyForecast({ hourly, limit = 24 }: HourlyForecastProps) {
  const { t, locale } = useLanguage();
  const points = hourly.slice(0, limit);

  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="mb-4 text-sm font-semibold text-mist-200">{t("home.hourly")}</h3>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {points.map((point, i) => (
          <div key={point.time} className="flex min-w-[64px] flex-col items-center gap-2 text-center">
            <span className="text-xs text-mist-400">
              {i === 0 ? t("home.now") : formatHourLabel(point.time, locale)}
            </span>
            <WeatherIcon group={point.condition_group} className="h-6 w-6 text-sky-300" />
            <span className="text-sm font-medium text-mist-100">{formatTemp(point.temperature)}</span>
            {point.precipitation_probability !== null &&
              point.precipitation_probability !== undefined &&
              point.precipitation_probability > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-sky-400">
                  <Droplets className="h-3 w-3" /> {formatPercent(point.precipitation_probability)}
                </span>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
