"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { formatTemp, locationLabel } from "@/lib/utils/format";
import type { WeatherResponse } from "@/lib/types";

interface WeatherHeroProps {
  weather: WeatherResponse;
}

export function WeatherHero({ weather }: WeatherHeroProps) {
  const { current, location } = weather;
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = now
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: location.timezone || undefined,
      }).format(now)
    : "";
  const timeLabel = now
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: location.timezone || undefined,
      }).format(now)
    : "";

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-10 animate-fade-in-up">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-mist-300">
            <MapPin className="h-4 w-4 text-sky-400" />
            <span>{locationLabel(location)}</span>
          </div>

          <div className="mt-3 flex items-end gap-3">
            <span className="text-7xl md:text-8xl font-semibold tracking-tight text-mist-100">
              {formatTemp(current.temperature)}
            </span>
            <span className="mb-3 text-lg text-mist-300">{current.condition}</span>
          </div>

          <p className="mt-2 text-mist-400">
            Feels like {formatTemp(current.feels_like)} &middot; {dateLabel} &middot; {timeLabel}
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 animate-float">
          <WeatherIcon group={current.condition_group} isDay={current.is_day} className="h-24 w-24 text-sky-300" />
        </div>
      </div>
    </div>
  );
}
