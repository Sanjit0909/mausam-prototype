"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Droplets, Eye, Gauge, Wind } from "lucide-react";
import { WeatherHero } from "@/components/weather/WeatherHero";
import { WeatherMetricCard } from "@/components/weather/WeatherMetricCard";
import { HourlyForecast } from "@/components/weather/HourlyForecast";
import { DailyForecast } from "@/components/weather/DailyForecast";
import { WeatherChart } from "@/components/weather/WeatherChart";
import { AQICard } from "@/components/weather/AQICard";
import { UVCard } from "@/components/weather/UVCard";
import { SunMoonCard } from "@/components/weather/SunMoonCard";
import { MarineCard } from "@/components/weather/MarineCard";
import { AlertBanner } from "@/components/alerts/AlertBanner";
import { PersonalizedInsight } from "@/components/personalization/PersonalizedInsight";
import { RecommendationCard } from "@/components/personalization/RecommendationCard";
import { LocationSearch } from "@/components/location/LocationSearch";
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useHomeData } from "@/hooks/useHomeData";
import { formatPercent, locationLabel, windDirectionLabel } from "@/lib/utils/format";

const METRIC_CARD_KEYS = ["humidity", "wind", "pressure", "visibility", "rain_probability", "uv_index", "aqi"] as const;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { location } = useLocation();
  const { preferences, loading: prefsLoading, hasOnboarded } = usePreferences();
  const { weather, forecast, airQuality, alerts, insights, astronomy, marine, loading, error, refresh } = useHomeData(
    location.lat,
    location.lon,
    locationLabel(location),
    preferences.interests
  );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!prefsLoading && user && !hasOnboarded) router.replace("/onboarding");
  }, [prefsLoading, hasOnboarded, user, router]);

  const orderedMetricKeys = useMemo(() => {
    const order = insights?.card_order ?? [];
    const known = METRIC_CARD_KEYS.filter((k) => order.includes(k));
    const rest = METRIC_CARD_KEYS.filter((k) => !known.includes(k));
    return [...known, ...rest];
  }, [insights]);

  if (authLoading || (prefsLoading && !preferences.interests.length)) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 space-y-6">
        <HeroSkeleton />
        <GridSkeleton />
      </div>
    );
  }

  const current = weather?.current;

  const metricRenderers: Record<string, React.ReactNode> = current
    ? {
        humidity: (
          <WeatherMetricCard icon={Droplets} label="Humidity" value={formatPercent(current.humidity)} accentClassName="text-sky-400" />
        ),
        wind: (
          <WeatherMetricCard
            icon={Wind}
            label="Wind"
            value={`${current.wind_speed.toFixed(0)} km/h`}
            sublabel={windDirectionLabel(current.wind_direction)}
            accentClassName="text-sky-400"
          />
        ),
        pressure: (
          <WeatherMetricCard icon={Gauge} label="Pressure" value={`${current.pressure.toFixed(0)} hPa`} accentClassName="text-mist-300" />
        ),
        visibility: (
          <WeatherMetricCard
            icon={Eye}
            label="Visibility"
            value={current.visibility ? `${current.visibility.toFixed(1)} km` : "--"}
            accentClassName="text-mist-300"
          />
        ),
        rain_probability: (
          <WeatherMetricCard
            icon={Droplets}
            label="Rain Chance"
            value={formatPercent(forecast?.daily[0]?.precipitation_probability_max)}
            sublabel="Today"
            accentClassName="text-sky-400"
          />
        ),
        uv_index: <UVCard uvIndex={current.uv_index} />,
        aqi: airQuality ? <AQICard data={airQuality} /> : (
          <WeatherMetricCard icon={Wind} label="Air Quality" value="--" sublabel="Unavailable" />
        ),
      }
    : {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-mist-100">
            {preferences.name ? `Hi ${preferences.name.split(" ")[0]},` : "Your homepage"}
          </h1>
          <p className="text-sm text-mist-400">Here&apos;s what matters most for you right now.</p>
        </div>
        <div className="w-full sm:w-80">
          <LocationSearch placeholder="Change location..." />
        </div>
      </div>

      {loading && (
        <div className="space-y-6">
          <HeroSkeleton />
          <GridSkeleton />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={refresh} />}

      {!loading && !error && weather && current && (
        <>
          {alerts && alerts.alerts.length > 0 && <AlertBanner alerts={alerts.alerts} />}

          {insights && insights.insights.length > 0 && (
            <div className="space-y-3">
              {insights.insights.slice(0, 2).map((insight, i) => (
                <PersonalizedInsight key={i} insight={insight} />
              ))}
            </div>
          )}

          <WeatherHero weather={weather} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {orderedMetricKeys.map((key) => <div key={key}>{metricRenderers[key]}</div>)}
          </div>

          {insights && insights.recommendations.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold text-mist-200">Recommended for You</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {insights.recommendations.map((card, i) => (
                  <RecommendationCard key={i} card={card} />
                ))}
              </div>
            </div>
          )}

          {forecast && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">Temperature Trend</h3>
                  <WeatherChart hourly={forecast.hourly} variant="temperature" />
                </div>
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">Rain Probability</h3>
                  <WeatherChart hourly={forecast.hourly} variant="rain" />
                </div>
              </div>

              <HourlyForecast hourly={forecast.hourly} />
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
