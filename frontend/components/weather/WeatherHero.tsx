"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { useLanguage } from "@/context/LanguageContext";
import { formatTemp, localizeProviderLabel, locationLabel, providerDisplayName } from "@/lib/utils/format";
import type { WeatherResponse } from "@/lib/types";

interface WeatherHeroProps {
  weather: WeatherResponse;
  title?: string;
  subtitle?: string;
}

export function WeatherHero({ weather, title, subtitle }: WeatherHeroProps) {
  const { current, location } = weather;
  const { locale, t } = useLanguage();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dateLocale = locale === "hi" ? "hi-IN" : "en-US";
  const dateLabel = now
    ? new Intl.DateTimeFormat(dateLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: location.timezone || undefined,
      }).format(now)
    : "";
  const timeLabel = now
    ? new Intl.DateTimeFormat(dateLocale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: location.timezone || undefined,
      }).format(now)
    : "";

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-10 animate-fade-in-up">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-sm text-mist-300">
            <MapPin className="h-4 w-4 text-sky-400" />
            <span>{locationLabel(location)}</span>
          </div>

          {(title || subtitle) && (
            <div className="mt-2">
              {title && <p className="text-xs font-semibold uppercase tracking-wide text-sky-400/90">{title}</p>}
              {subtitle && <p className="text-sm text-mist-400">{subtitle}</p>}
            </div>
          )}

          <div className="mt-3 flex items-end gap-3">
            <span className="text-7xl font-semibold tracking-tight text-mist-100 md:text-8xl">
              {formatTemp(current.temperature)}
            </span>
            <span className="mb-3 text-lg text-mist-300">{current.condition}</span>
          </div>

          <p className="mt-2 text-mist-400">
            {t("home.feelsLike", { temp: formatTemp(current.feels_like) })} &middot; {dateLabel} &middot; {timeLabel}
          </p>

          <SourceBadge
            provider={
              weather.provider_label
                ? localizeProviderLabel(weather.provider_label, t)
                : providerDisplayName(weather.source)
            }
            kind={t("home.currentConditions")}
            updatedAt={current.observed_at}
            official={weather.source === "imd"}
            className="mt-3"
          />
          {weather.observation_station && (
            <p className="mt-2 text-xs text-mist-500">
              {weather.station_distance_km != null
                ? t("home.observedAtKm", {
                    station: weather.observation_station,
                    km: weather.station_distance_km.toFixed(0),
                  })
                : t("home.observedAt", { station: weather.observation_station })}
            </p>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 animate-float">
          <WeatherIcon group={current.condition_group} isDay={current.is_day} className="h-24 w-24 text-sky-300" />
        </div>
      </div>
    </div>
  );
}
