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
import { PersonaSwitcher } from "@/components/personalization/PersonaSwitcher";
import { LocationSearch } from "@/components/location/LocationSearch";
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useHomeData } from "@/hooks/useHomeData";
import { trackCardInteraction } from "@/hooks/useInteractionTracking";
import { useLanguage } from "@/context/LanguageContext";
import { formatPercent, locationLabel, windDirectionLabel } from "@/lib/utils/format";

const METRIC_CARD_KEYS = ["humidity", "wind", "pressure", "visibility", "rain_probability", "uv_index", "aqi"] as const;

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { location } = useLocation();
  const { preferences, loading: prefsLoading, hasOnboarded } = usePreferences();
  const { t } = useLanguage();
  const { weather, forecast, airQuality, alerts, insights, astronomy, marine, loading, refreshing, error, refresh } = useHomeData(
    location.lat,
    location.lon,
    locationLabel(location),
    preferences.interests
  );
  const reasons = insights?.card_reasons ?? {};

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
          <WeatherMetricCard
            icon={Droplets}
            label={t("home.humidity")}
            value={formatPercent(current.humidity)}
            accentClassName="text-sky-400"
            reason={reasons.humidity}
            onActivate={() => trackCardInteraction("humidity")}
          />
        ),
        wind: (
          <WeatherMetricCard
            icon={Wind}
            label={t("home.wind")}
            value={`${current.wind_speed.toFixed(0)} km/h`}
            sublabel={windDirectionLabel(current.wind_direction)}
            accentClassName="text-sky-400"
            reason={reasons.wind}
            onActivate={() => trackCardInteraction("wind")}
          />
        ),
        pressure: (
          <WeatherMetricCard
            icon={Gauge}
            label={t("home.pressure")}
            value={`${current.pressure.toFixed(0)} hPa`}
            accentClassName="text-mist-300"
            reason={reasons.pressure}
            onActivate={() => trackCardInteraction("pressure")}
          />
        ),
        visibility: (
          <WeatherMetricCard
            icon={Eye}
            label={t("home.visibility")}
            value={current.visibility ? `${current.visibility.toFixed(1)} km` : "--"}
            accentClassName="text-mist-300"
            reason={reasons.visibility}
            onActivate={() => trackCardInteraction("visibility")}
          />
        ),
        rain_probability: (
          <WeatherMetricCard
            icon={Droplets}
            label={t("home.rainChance")}
            value={formatPercent(forecast?.daily[0]?.precipitation_probability_max)}
            sublabel={t("home.rainToday")}
            accentClassName="text-sky-400"
            reason={reasons.rain_probability}
            onActivate={() => trackCardInteraction("rain_probability")}
          />
        ),
        uv_index: (
          <UVCard
            uvIndex={current.uv_index}
            reason={reasons.uv_index}
            onActivate={() => trackCardInteraction("uv_index")}
          />
        ),
        aqi: airQuality ? (
          <AQICard data={airQuality} reason={reasons.aqi} onActivate={() => trackCardInteraction("aqi")} />
        ) : (
          <WeatherMetricCard
            icon={Wind}
            label={t("home.aqi")}
            value="--"
            sublabel={t("home.aqiUnavailable")}
            reason={reasons.aqi}
            onActivate={() => trackCardInteraction("aqi")}
          />
        ),
      }
    : {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-mist-100">
            {preferences.name
              ? t("home.greetingNamed", { name: preferences.name.split(" ")[0] })
              : t("home.greeting")}
          </h1>
          <p className="text-sm text-mist-400">{t("home.subtitle")}</p>
        </div>
        <div className="w-full sm:w-80">
          <LocationSearch placeholder={t("home.changeLocation")} />
        </div>
      </div>

      <PersonaSwitcher />

      {refreshing && weather && (
        <p className="text-xs text-mist-500">Updating personalized cards…</p>
      )}

      {loading && !weather && (
        <div className="space-y-6">
          <HeroSkeleton />
          <GridSkeleton />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && !weather && <ErrorState message={error || t("home.loadError")} onRetry={refresh} />}

      {weather && current && (
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
              <h2 className="mb-3 text-sm font-semibold text-mist-200">{t("home.recommended")}</h2>
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
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">{t("home.tempTrend")}</h3>
                  <WeatherChart hourly={forecast.hourly} variant="temperature" />
                </div>
                <div className="glass rounded-3xl p-6">
                  <h3 className="text-sm font-semibold text-mist-200 mb-2">{t("home.rainProb")}</h3>
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
