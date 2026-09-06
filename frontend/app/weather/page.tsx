"use client";

import { Droplets, Eye, Gauge, Thermometer, Wind } from "lucide-react";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { WeatherMetricCard } from "@/components/weather/WeatherMetricCard";
import { HourlyForecast } from "@/components/weather/HourlyForecast";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { WeatherChart } from "@/components/weather/WeatherChart";
import { AQICard } from "@/components/weather/AQICard";
import { UVCard } from "@/components/weather/UVCard";
import { SunMoonCard } from "@/components/weather/SunMoonCard";
import { MarineCard } from "@/components/weather/MarineCard";
import { WeatherMapCard, MarineMapCard } from "@/components/weather/WeatherMapCard";
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import { useHomeData } from "@/hooks/useHomeData";
import { formatPercent, formatPressure, formatVisibility, formatWind, locationLabel, windDirectionLabel } from "@/lib/utils/format";

export default function WeatherDetailsPage() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { t, locale } = useLanguage();
  const { weather, forecast, airQuality, astronomy, marine, loading, error, refresh } = useHomeData(
    location.lat,
    location.lon,
    locationLabel(location),
    preferences.interests
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div>
        <h1 className="text-xl font-semibold text-mist-100">{t("weather.title")}</h1>
        <p className="text-sm text-mist-400">{t("weather.subtitle", { name: location.name })}</p>
      </div>

      {loading && (
        <div className="space-y-6">
          <HeroSkeleton />
          <GridSkeleton />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={refresh} />}

      {!loading && !error && weather && (
        <>
          <WeatherHero weather={weather} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <WeatherMetricCard
              icon={Thermometer}
              label={t("weather.feelsLike")}
              value={`${weather.current.feels_like.toFixed(0)}°`}
            />
            <WeatherMetricCard icon={Droplets} label={t("home.humidity")} value={formatPercent(weather.current.humidity)} />
            <WeatherMetricCard
              icon={Wind}
              label={t("home.wind")}
              value={formatWind(weather.current.wind_speed)}
              sublabel={windDirectionLabel(weather.current.wind_direction, locale)}
            />
            <WeatherMetricCard
              icon={Gauge}
              label={t("home.pressure")}
              value={formatPressure(weather.current.pressure)}
            />
            <WeatherMetricCard
              icon={Eye}
              label={t("home.visibility")}
              value={formatVisibility(weather.current.visibility)}
            />
            <UVCard uvIndex={weather.current.uv_index} />
            {airQuality && <AQICard data={airQuality} />}
          </div>

          {forecast && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="glass rounded-3xl p-6">
                  <h3 className="mb-2 text-sm font-semibold text-mist-200">{t("weather.tempTrend48")}</h3>
                  <WeatherChart hourly={forecast.hourly} variant="temperature" limit={48} />
                </div>
                <div className="glass rounded-3xl p-6">
                  <h3 className="mb-2 text-sm font-semibold text-mist-200">{t("weather.rainProb48")}</h3>
                  <WeatherChart hourly={forecast.hourly} variant="rain" limit={48} />
                </div>
              </div>
              <HourlyForecast hourly={forecast.hourly} limit={48} />
              <DailyForecast daily={forecast.daily} />

              <WeatherMapCard
                lat={location.lat}
                lon={location.lon}
                locationName={location.name}
              />
            </>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {astronomy && <SunMoonCard data={astronomy} />}
            {marine && marine.available && <MarineCard data={marine} />}
          </div>

          {marine && marine.available && (
            <MarineMapCard locationName={location.name} />
          )}
        </>
      )}
    </div>
  );
}
