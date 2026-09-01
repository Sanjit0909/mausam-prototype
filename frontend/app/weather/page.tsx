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
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useHomeData } from "@/hooks/useHomeData";
import { formatPercent, locationLabel, windDirectionLabel } from "@/lib/utils/format";

export default function WeatherDetailsPage() {
  const { location } = useLocation();
  const { preferences } = usePreferences();
  const { weather, forecast, airQuality, astronomy, marine, loading, error, refresh } = useHomeData(
    location.lat,
    location.lon,
    locationLabel(location),
    preferences.interests
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-mist-100">Weather Details</h1>
        <p className="text-sm text-mist-400">Complete conditions and forecast for {location.name}.</p>
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
            <WeatherMetricCard icon={Thermometer} label="Feels Like" value={`${weather.current.feels_like.toFixed(0)}\u00b0`} />
            <WeatherMetricCard icon={Droplets} label="Humidity" value={formatPercent(weather.current.humidity)} />
            <WeatherMetricCard
              icon={Wind}
              label="Wind"
              value={`${weather.current.wind_speed.toFixed(0)} km/h`}
              sublabel={windDirectionLabel(weather.current.wind_direction)}
            />
            <WeatherMetricCard icon={Gauge} label="Pressure" value={`${weather.current.pressure.toFixed(0)} hPa`} />
            <WeatherMetricCard
              icon={Eye}
              label="Visibility"
              value={weather.current.visibility ? `${weather.current.visibility.toFixed(1)} km` : "--"}
            />
            <UVCard uvIndex={weather.current.uv_index} />
            {airQuality && <AQICard data={airQuality} />}
          </div>

          {forecast && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">Temperature Trend (48h)</h3>
                  <WeatherChart hourly={forecast.hourly} variant="temperature" limit={48} />
                </div>
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">Rain Probability (48h)</h3>
                  <WeatherChart hourly={forecast.hourly} variant="rain" limit={48} />
                </div>
              </div>
              <HourlyForecast hourly={forecast.hourly} limit={48} />
              <DailyForecast daily={forecast.daily} />
            </>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {astronomy && <SunMoonCard data={astronomy} />}
            {marine && marine.available && <MarineCard data={marine} />}
          </div>
        </>
      )}
    </div>
  );
}
