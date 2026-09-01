import { Droplets } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatDayLabel, formatPercent, formatTemp } from "@/lib/utils/format";
import type { DailyPoint } from "@/lib/types";

interface DailyForecastProps {
  daily: DailyPoint[];
}

export function DailyForecast({ daily }: DailyForecastProps) {
  const maxTemp = Math.max(...daily.map((d) => d.temp_max));
  const minTemp = Math.min(...daily.map((d) => d.temp_min));
  const range = Math.max(maxTemp - minTemp, 1);

  return (
    <div className="glass rounded-3xl p-6">
      <h3 className="text-sm font-semibold text-mist-200 mb-4">{daily.length}-Day Forecast</h3>
      <div className="flex flex-col divide-y divide-white/5">
        {daily.map((day, i) => {
          const leftPct = ((day.temp_min - minTemp) / range) * 100;
          const widthPct = ((day.temp_max - day.temp_min) / range) * 100;
          return (
            <div key={day.date} className="flex items-center gap-3 py-3 text-sm">
              <span className="w-16 shrink-0 text-mist-300">{formatDayLabel(day.date, i)}</span>
              <WeatherIcon group={day.condition_group} className="h-5 w-5 shrink-0 text-sky-300" />
              {(day.precipitation_probability_max || 0) > 0 ? (
                <span className="flex w-12 shrink-0 items-center gap-0.5 text-[11px] text-sky-400">
                  <Droplets className="h-3 w-3" /> {formatPercent(day.precipitation_probability_max)}
                </span>
              ) : (
                <span className="w-12 shrink-0" />
              )}
              <span className="w-9 shrink-0 text-right text-mist-400">{formatTemp(day.temp_min)}</span>
              <div className="relative h-1.5 flex-1 rounded-full bg-white/5">
                <div
                  className="absolute h-1.5 rounded-full bg-gradient-to-r from-sky-500 to-amber-400"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                />
              </div>
              <span className="w-9 shrink-0 text-mist-100">{formatTemp(day.temp_max)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
