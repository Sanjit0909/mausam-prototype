"use client";

import { useMemo } from "react";
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
import { ExpandablePersonaCard } from "@/components/personalization/ExpandablePersonaCard";
import { trackCardInteraction } from "@/hooks/useInteractionTracking";
import { useLanguage } from "@/context/LanguageContext";
import { getPersonaConfig, type HomeSectionId, type PersonaId } from "@/lib/personalization/personaConfig";
import { localizePersonaCardText } from "@/lib/i18n/localizePersona";
import { formatPercent, formatPressure, formatVisibility, formatWind, windDirectionLabel } from "@/lib/utils/format";
import type { TranslationKey } from "@/lib/i18n/translations";
import type {
  AirQualityResponse,
  AlertsResponse,
  AstronomyResponse,
  ForecastResponse,
  InsightsResponse,
  MarineResponse,
  PersonaCard,
  PersonaHomePayload,
  WeatherResponse,
} from "@/lib/types";

const METRIC_CARD_KEYS = ["humidity", "wind", "pressure", "visibility", "rain_probability", "uv_index", "aqi"] as const;

/** Metric keys already covered by large persona cards — omit from compact metrics grid. */
const SPECIALTY_METRIC_OMIT: Partial<Record<PersonaId, string[]>> = {
  farmer: ["rain_probability", "humidity"],
  runner: ["aqi", "uv_index", "humidity", "rain_probability", "wind"],
  traveller: ["visibility", "rain_probability", "wind"],
};

const PERSONA_CARD_SECTIONS = new Set<HomeSectionId>([
  "crop_stage",
  "agromet_advisory",
  "irrigation",
  "soil_moisture",
  "crop_risk",
  "farm_forecast",
  "best_run_time",
  "heat_humidity",
  "aqi",
  "uv",
  "rain",
  "wind",
  "hydration",
  "hourly_run",
  "travel_risk",
  "visibility",
  "temperature",
  "hourly_travel",
  "packing",
]);

function cardsForSection(section: HomeSectionId, cards: PersonaCard[]): PersonaCard[] {
  if (section === "crop_risk") return cards.filter((c) => c.id.startsWith("crop_risk"));
  if (section === "aqi") return cards.filter((c) => c.id === "aqi");
  if (section === "uv") return cards.filter((c) => c.id === "uv");
  if (section === "rain") return cards.filter((c) => c.id === "rain");
  if (section === "wind") return cards.filter((c) => c.id === "wind");
  if (section === "visibility") return cards.filter((c) => c.id === "visibility");
  if (section === "temperature") return cards.filter((c) => c.id === "temperature");
  return cards.filter((c) => c.id === section);
}

export interface PersonaHomeDashboardProps {
  personaId: PersonaId;
  weather: WeatherResponse;
  forecast: ForecastResponse | null;
  airQuality: AirQualityResponse | null;
  alerts: AlertsResponse | null;
  insights: InsightsResponse | null;
  astronomy: AstronomyResponse | null;
  marine: MarineResponse | null;
  persona: PersonaHomePayload | null;
}

export function PersonaHomeDashboard({
  personaId,
  weather,
  forecast,
  airQuality,
  alerts,
  insights,
  astronomy,
  marine,
  persona,
}: PersonaHomeDashboardProps) {
  const { t, locale } = useLanguage();
  const personaConfig = getPersonaConfig(personaId);
  const reasons = insights?.card_reasons ?? {};
  const personaCards = persona?.cards ?? [];
  const sectionOrder = (persona?.section_order as HomeSectionId[] | undefined) ?? personaConfig.sectionOrder;
  const current = weather.current;

  const orderedMetricKeys = useMemo(() => {
    const omit = new Set(SPECIALTY_METRIC_OMIT[personaId] ?? []);
    const priority = persona?.metric_priority?.length
      ? persona.metric_priority
      : personaConfig.metricPriority;
    const order = [...priority, ...(insights?.card_order ?? [])];
    const known = METRIC_CARD_KEYS.filter((k) => order.includes(k) && !omit.has(k));
    const rest = METRIC_CARD_KEYS.filter((k) => !known.includes(k) && !omit.has(k));
    return [...new Set([...known, ...rest])];
  }, [insights, persona, personaConfig.metricPriority, personaId]);

  const heroTitle = localizePersonaCardText(
    persona?.hero_title || t(personaConfig.heroTitleKey as TranslationKey),
    locale
  );
  const heroSubtitle = localizePersonaCardText(persona?.hero_subtitle || "", locale);

  const metricRenderers: Record<string, React.ReactNode> = {
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
        value={formatWind(current.wind_speed)}
        sublabel={windDirectionLabel(current.wind_direction, locale)}
        accentClassName="text-sky-400"
        reason={reasons.wind}
        onActivate={() => trackCardInteraction("wind")}
      />
    ),
    pressure: (
      <WeatherMetricCard
        icon={Gauge}
        label={t("home.pressure")}
        value={formatPressure(current.pressure)}
        accentClassName="text-mist-300"
        reason={reasons.pressure}
        onActivate={() => trackCardInteraction("pressure")}
      />
    ),
    visibility: (
      <WeatherMetricCard
        icon={Eye}
        label={t("home.visibility")}
        value={formatVisibility(current.visibility)}
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
  };

  const renderSection = (section: HomeSectionId, key: string) => {
    if (PERSONA_CARD_SECTIONS.has(section)) {
      const sectionCards = cardsForSection(section, personaCards);
      if (sectionCards.length === 0) return null;
      if (section === "crop_risk") {
        return (
          <div key={key} className="space-y-3">
            <h2 className="text-sm font-semibold text-mist-200">{t("persona.section.cropRisk")}</h2>
            <div className="space-y-3">
              {sectionCards.map((card) => (
                <ExpandablePersonaCard key={card.id} card={card} />
              ))}
            </div>
          </div>
        );
      }
      return (
        <div key={key} className="space-y-3">
          {sectionCards.map((card) => (
            <ExpandablePersonaCard key={card.id} card={card} />
          ))}
        </div>
      );
    }

    switch (section) {
      case "alerts":
        return alerts && alerts.alerts.length > 0 ? <AlertBanner key={key} alerts={alerts.alerts} /> : null;
      case "hero":
        return <WeatherHero key={key} weather={weather} title={heroTitle} subtitle={heroSubtitle} />;
      case "insights":
        return insights && insights.insights.length > 0 ? (
          <div key={key} className="space-y-3">
            {insights.insights.slice(0, 2).map((insight, i) => (
              <PersonalizedInsight key={i} insight={insight} />
            ))}
          </div>
        ) : null;
      case "metrics":
        if (orderedMetricKeys.length === 0) return null;
        return (
          <div key={key}>
            <h2 className="mb-3 text-sm font-semibold text-mist-200">{t("persona.section.moreMetrics")}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {orderedMetricKeys.map((metricKey) => (
                <div key={metricKey}>{metricRenderers[metricKey]}</div>
              ))}
            </div>
          </div>
        );
      case "recommendations":
        return insights && insights.recommendations.length > 0 ? (
          <div key={key}>
            <h2 className="mb-3 text-sm font-semibold text-mist-200">
              {t(personaConfig.terminology.recommendations as TranslationKey)}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {insights.recommendations.map((card, i) => (
                <RecommendationCard key={i} card={card} />
              ))}
            </div>
          </div>
        ) : null;
      case "charts":
        return forecast ? (
          <div key={key} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-semibold text-mist-200">
                {personaId === "farmer" ? t("persona.charts.farmTemp") : t("home.tempTrend")}
              </h3>
              <WeatherChart hourly={forecast.hourly} variant="temperature" />
            </div>
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-semibold text-mist-200">
                {personaId === "farmer" ? t("persona.charts.farmRain") : t("home.rainProb")}
              </h3>
              <WeatherChart hourly={forecast.hourly} variant="rain" />
            </div>
          </div>
        ) : null;
      case "hourly":
        return forecast ? <HourlyForecast key={key} hourly={forecast.hourly} /> : null;
      case "daily":
        return forecast ? (
          <div key={key}>
            {personaId === "farmer" && (
              <h2 className="mb-3 text-sm font-semibold text-mist-200">{t("persona.term.dailyOutlook")}</h2>
            )}
            <DailyForecast daily={forecast.daily} />
          </div>
        ) : null;
      case "astronomy":
        return astronomy ? <SunMoonCard key={key} data={astronomy} /> : null;
      case "marine":
        return marine && marine.available ? <MarineCard key={key} data={marine} /> : null;
      default:
        return null;
    }
  };

  return <div className="space-y-5">{sectionOrder.map((section, idx) => renderSection(section, `${section}-${idx}`))}</div>;
}
