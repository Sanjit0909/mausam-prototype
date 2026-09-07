"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Satellite } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { WeatherIcon } from "@/components/weather/WeatherIcon";
import { WeatherHeroAtmosphere } from "@/components/weather/WeatherHeroAtmosphere";
import { AnimatedTemperature } from "@/components/common/Motion";
import { useLanguage } from "@/context/LanguageContext";
import {
  formatTemp,
  isPureImdWeatherSource,
  localizeProviderLabel,
  locationLabel,
  providerDisplayName,
} from "@/lib/utils/format";
import { localizeWeatherCondition } from "@/lib/i18n/localizeWeather";
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
    <div className="glass relative overflow-hidden rounded-3xl p-8 md:p-10 shadow-2xl transition-all duration-300 animate-fade-in-up">
      {/* Subtle Environmental Motion Layer */}
      <WeatherHeroAtmosphere
        conditionGroup={current.condition_group}
        isDay={current.is_day}
      />

      <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-sm text-mist-300 transition-colors hover:text-sky-300">
              <MapPin className="h-4 w-4 text-sky-400" />
              <span className="font-medium">{locationLabel(location)}</span>
            </div>
            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/20 hover:border-sky-400/50 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Satellite className="h-3.5 w-3.5 text-sky-400" />
              <span>Live 2D/3D Radar Map</span>
            </Link>
          </div>

          {(title || subtitle) && (
            <div className="pt-1">
              {title && <p className="text-xs font-semibold uppercase tracking-wide text-sky-400/90">{title}</p>}
              {subtitle && <p className="text-sm text-mist-400">{subtitle}</p>}
            </div>
          )}

          <div className="flex items-end gap-3 pt-1">
            <span className="text-7xl font-semibold tracking-tight text-mist-100 md:text-8xl transition-all">
              <AnimatedTemperature value={Math.round(current.temperature)} />
            </span>
            <span className="mb-3 text-lg font-medium text-mist-300 transition-colors">
              {localizeWeatherCondition(current.condition, locale)}
            </span>
          </div>

          <p className="text-sm text-mist-400">
            {t("home.feelsLike", { temp: "" })}
            <span className="font-medium text-mist-200">
              <AnimatedTemperature value={Math.round(current.feels_like)} />
            </span>
            {" · "}
            {dateLabel}
            {" · "}
            {timeLabel}
          </p>

          <SourceBadge
            provider={
              weather.provider_label
                ? localizeProviderLabel(weather.provider_label, t)
                : providerDisplayName(weather.source)
            }
            kind={t("home.currentConditions")}
            updatedAt={current.observed_at}
            // Shield only for pure IMD observation bundles — never for Open-Meteo /
            // OpenWeatherMap / Weatherstack / mixed field-fallback responses.
            official={isPureImdWeatherSource(weather.source)}
            className="mt-4 inline-flex"
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

        <div className="flex flex-col items-center gap-2 group cursor-pointer animate-float">
          <div className="relative flex items-center justify-center p-3 rounded-full transition-transform duration-300 group-hover:scale-110">
            <div className="absolute inset-0 rounded-full bg-sky-400/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <WeatherIcon
              group={current.condition_group}
              isDay={current.is_day}
              className="relative h-24 w-24 text-sky-300 transition-colors group-hover:text-sky-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
