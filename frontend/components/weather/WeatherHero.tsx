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
import type { ForecastResponse, WeatherResponse } from "@/lib/types";

interface WeatherHeroProps {
  weather: WeatherResponse;
  forecast?: ForecastResponse | null;
  title?: string;
  subtitle?: string;
}

export function WeatherHero({ weather, forecast, title, subtitle }: WeatherHeroProps) {
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

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          {/* Location Pin Header (Matching Reference Screenshot) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-neutral-900/70">
              <MapPin className="h-4 w-4 text-sky-200 dark:text-sky-400" />
              <span className="tracking-wide">{locationLabel(location)}</span>
            </div>

            <Link
              href="/map"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold text-white shadow-sm backdrop-blur-md hover:bg-white/25 active:scale-95 transition-all duration-200 dark:border-white/10 dark:bg-neutral-900/80 dark:text-sky-300"
            >
              <Satellite className="h-3.5 w-3.5 text-sky-200 dark:text-sky-400" />
              <span>Live 2D/3D Radar Map</span>
            </Link>
          </div>

          {(title || subtitle) && (
            <div className="pt-1">
              {title && <p className="text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">{title}</p>}
              {subtitle && <p className="text-sm text-white/80 dark:text-neutral-400">{subtitle}</p>}
            </div>
          )}

          {/* Large Weather Hero: Temperature + Condition (Direct Reference from Screenshot) */}
          <div className="pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-8xl font-light tracking-tighter text-white sm:text-9xl drop-shadow-sm transition-all leading-none">
                <AnimatedTemperature value={Math.round(current.temperature)} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-medium tracking-tight text-white/95 sm:text-3xl">
              {localizeWeatherCondition(current.condition, locale)}
            </p>
          </div>

          {/* High / Low & Feels Like (Exact Reference format: ↑ 33° / ↓ 24°  Feels like 36°) */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-sm font-medium text-white/90 dark:text-neutral-300">
            {forecast?.daily?.[0] ? (
              <span>
                ↑ {Math.round(forecast.daily[0].temp_max)}° / ↓ {Math.round(forecast.daily[0].temp_min)}°
              </span>
            ) : null}
            <span>
              {t("home.feelsLike", { temp: "" })}
              <span className="font-semibold text-white">
                <AnimatedTemperature value={Math.round(current.feels_like)} />
              </span>
            </span>
            <span className="text-white/60 dark:text-neutral-500 hidden sm:inline">·</span>
            <span className="text-xs text-white/75 dark:text-neutral-400 hidden sm:inline">
              {dateLabel} {timeLabel && `(${timeLabel})`}
            </span>
          </div>

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
            <p className="mt-2 text-xs text-white/70 dark:text-neutral-400">
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
