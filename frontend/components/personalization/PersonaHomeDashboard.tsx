"use client";

import { useMemo, useState, useEffect } from "react";
import { Droplets, Eye, Gauge, Wind, RotateCcw, Pin } from "lucide-react";
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
import { Reveal, StaggerContainer } from "@/components/common/Motion";
import { trackCardInteraction } from "@/hooks/useInteractionTracking";
import { useLanguage } from "@/context/LanguageContext";
import { getPersonaConfig, type HomeSectionId, type PersonaId } from "@/lib/personalization/personaConfig";
import { localizePersonaCardText } from "@/lib/i18n/localizePersona";
import { formatPercent, formatPressure, formatVisibility, formatWind, windDirectionLabel } from "@/lib/utils/format";
import {
  rankCardIds,
  loadPinnedCards,
  savePinnedCards,
  loadHiddenCards,
  saveHiddenCards,
  type PersonaId as RankingPersonaId,
  type WeatherScoringContext,
} from "@/lib/personalization/rankingEngine";
import { synthesizeCardsForPersona } from "@/lib/personalization/personaCardSynthesizer";
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
const SPECIALTY_METRIC_OMIT: Record<string, string[]> = {
  farmer: ["rain_probability", "humidity"],
  runner: ["aqi", "uv_index", "humidity", "rain_probability", "wind"],
  commuter: ["visibility", "rain_probability"],
  traveler: ["visibility", "rain_probability", "wind"],
  traveller: ["visibility", "rain_probability", "wind"],
};

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
  const normalizedPersonaId = (
    personaId === "traveller" ? "traveler" : personaId === "health_vulnerable" ? "health" : personaId
  ) as RankingPersonaId;

  const personaConfig = getPersonaConfig(personaId);
  const current = weather.current;

  // Pin & Hide state management with localStorage persistence
  const [pinnedCardIds, setPinnedCardIds] = useState<Set<string>>(() =>
    loadPinnedCards(normalizedPersonaId)
  );
  const [hiddenCardIds, setHiddenCardIds] = useState<Set<string>>(() =>
    loadHiddenCards(normalizedPersonaId)
  );

  // Sync state if persona changes
  useEffect(() => {
    setPinnedCardIds(loadPinnedCards(normalizedPersonaId));
    setHiddenCardIds(loadHiddenCards(normalizedPersonaId));
  }, [normalizedPersonaId]);

  const handleTogglePin = (cardId: string) => {
    setPinnedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      savePinnedCards(normalizedPersonaId, next);
      return next;
    });
    trackCardInteraction(cardId);
  };

  const handleHideCard = (cardId: string) => {
    setHiddenCardIds((prev) => {
      const next = new Set(prev);
      next.add(cardId);
      saveHiddenCards(normalizedPersonaId, next);
      return next;
    });
    trackCardInteraction(cardId);
  };

  const handleRestoreHiddenCards = () => {
    setHiddenCardIds(new Set());
    saveHiddenCards(normalizedPersonaId, new Set());
  };

  // Combine backend cards with synthesized fallback cards to ensure all 8 personas have rich content
  const allCards = useMemo(() => {
    const backendCards = persona?.cards ?? [];
    const synthesized = synthesizeCardsForPersona(
      normalizedPersonaId,
      weather,
      forecast,
      airQuality,
      alerts
    );

    // Merge: backend cards win if ID matches, else add synthesized
    const cardMap = new Map<string, PersonaCard>();
    for (const c of synthesized) cardMap.set(c.id, c);
    for (const c of backendCards) cardMap.set(c.id, c);

    return Array.from(cardMap.values());
  }, [persona?.cards, normalizedPersonaId, weather, forecast, airQuality, alerts]);

  // Scoring context for deterministic ranking
  const scoringContext: WeatherScoringContext = useMemo(
    () => ({
      temperature: current.temperature,
      feelsLike: current.feels_like,
      humidity: current.humidity ?? undefined,
      windSpeed: current.wind_speed ?? undefined,
      rainProbability:
        forecast?.hourly?.[0]?.precipitation_probability ??
        (current.precipitation && current.precipitation > 0 ? 80 : 10),
      visibilityKm: current.visibility ?? undefined,
      uvIndex: current.uv_index ?? 5,
      aqi: airQuality?.us_aqi ?? 85,
      isCoastal: Boolean(marine?.available),
      currentHourIST: new Date().getHours(),
    }),
    [current, forecast, airQuality, marine]
  );

  // Compute deterministic ranking and score breakdowns
  const { orderedIds, scoreMap } = useMemo(() => {
    const cardIds = allCards.map((c) => c.id);
    return rankCardIds(cardIds, normalizedPersonaId, scoringContext, pinnedCardIds, hiddenCardIds);
  }, [allCards, normalizedPersonaId, scoringContext, pinnedCardIds, hiddenCardIds]);

  // Map of cardId -> PersonaCard
  const cardLookup = useMemo(() => {
    const map = new Map<string, PersonaCard>();
    for (const c of allCards) map.set(c.id, c);
    return map;
  }, [allCards]);

  const orderedMetricKeys = useMemo(() => {
    const omit = new Set(SPECIALTY_METRIC_OMIT[normalizedPersonaId] ?? []);
    const priority = persona?.metric_priority?.length
      ? persona.metric_priority
      : personaConfig.metricPriority;
    const order = [...priority, ...(insights?.card_order ?? [])];
    const known = METRIC_CARD_KEYS.filter((k) => order.includes(k) && !omit.has(k));
    const rest = METRIC_CARD_KEYS.filter((k) => !known.includes(k) && !omit.has(k));
    return [...new Set([...known, ...rest])];
  }, [insights, persona, personaConfig.metricPriority, normalizedPersonaId]);

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
        value={formatPercent(current.humidity ?? 0)}
      />
    ),
    wind: (
      <WeatherMetricCard
        icon={Wind}
        label={t("home.wind")}
        value={formatWind(current.wind_speed ?? 0)}
        windDeg={current.wind_direction}
        sublabel={
          current.wind_direction != null
            ? `${windDirectionLabel(current.wind_direction)} (${current.wind_direction}°)`
            : undefined
        }
      />
    ),
    pressure: (
      <WeatherMetricCard
        icon={Gauge}
        label={t("home.pressure")}
        value={formatPressure(current.pressure ?? 1013)}
      />
    ),
    visibility: (
      <WeatherMetricCard
        icon={Eye}
        label={t("home.visibility")}
        value={formatVisibility(current.visibility ?? 10)}
      />
    ),
    rain_probability: (
      <WeatherMetricCard
        icon={Droplets}
        label={locale === "hi" ? "वर्षा संभावना" : "Rain Probability"}
        value={formatPercent(
          forecast?.hourly?.[0]?.precipitation_probability ??
            (current.precipitation ? 80 : 0)
        )}
      />
    ),
    uv_index: current.uv_index != null ? <UVCard uvIndex={current.uv_index} /> : null,
    aqi: airQuality ? <AQICard data={airQuality} /> : null,
  };

  const hasActiveAlerts = alerts && alerts.alerts.length > 0;

  return (
    <div key={personaId} className="space-y-6 animate-in fade-in duration-300">
      {/* PHASE 5: Official IMD Alert Override — Always Anchored at the Absolute Top */}
      {hasActiveAlerts && (
        <Reveal delay={0}>
          <AlertBanner alerts={alerts.alerts} />
        </Reveal>
      )}

      {/* Hero Weather Cockpit */}
      <Reveal delay={50}>
        <WeatherHero weather={weather} title={heroTitle} subtitle={heroSubtitle} />
      </Reveal>

      {/* Restore Hidden Cards banner if user previously hid any card */}
      {hiddenCardIds.size > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs text-mist-300">
          <span>
            {locale === "hi"
              ? `${hiddenCardIds.size} कार्ड छिपाए गए हैं`
              : `${hiddenCardIds.size} personalized cards hidden`}
          </span>
          <button
            onClick={handleRestoreHiddenCards}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
          >
            <RotateCcw className="h-3 w-3" />
            <span>{locale === "hi" ? "सभी पुनर्स्थापित करें" : "Restore all"}</span>
          </button>
        </div>
      )}

      {/* PHASE 4 & 8: Dynamically Ranked Specialty Persona Cards */}
      {orderedIds.length > 0 && (
        <section aria-label="Personalized Weather Intelligence" className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-sky-400">
              {locale === "hi" ? "प्राथमिकता-आधारित इंटेलिजेंस" : "Ranked Personal Intelligence"}
            </h2>
            <span className="text-[11px] text-mist-400">
              {locale === "hi" ? "मल्टी-फैक्टर स्कोरिंग द्वारा व्यवस्थित" : "Multi-factor Deterministic Order"}
            </span>
          </div>

          <div className="space-y-3">
            {orderedIds.map((cardId, idx) => {
              const card = cardLookup.get(cardId);
              if (!card) return null;
              const breakdown = scoreMap[cardId];
              return (
                <Reveal key={cardId} delay={Math.min(idx * 50, 250)}>
                  <ExpandablePersonaCard
                    card={card}
                    scoreBreakdown={breakdown}
                    onTogglePin={handleTogglePin}
                    onHideCard={handleHideCard}
                  />
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* Personalized Insights */}
      {insights && insights.insights.length > 0 && (
        <Reveal delay={100}>
          <div className="space-y-3">
            {insights.insights.slice(0, 2).map((insight, i) => (
              <PersonalizedInsight key={i} insight={insight} />
            ))}
          </div>
        </Reveal>
      )}

      {/* Compact Secondary Metrics Grid */}
      {orderedMetricKeys.length > 0 && (
        <Reveal delay={150}>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-mist-200">
              {t("persona.section.moreMetrics")}
            </h2>
            <StaggerContainer className="grid grid-cols-2 gap-4 md:grid-cols-4" staggerMs={50}>
              {orderedMetricKeys.map((metricKey) => (
                <div key={metricKey}>{metricRenderers[metricKey]}</div>
              ))}
            </StaggerContainer>
          </div>
        </Reveal>
      )}

      {/* AI Recommendations */}
      {insights && insights.recommendations.length > 0 && (
        <Reveal delay={200}>
          <div>
            <h2 className="mb-3 text-sm font-semibold text-mist-200">
              {t(personaConfig.terminology.recommendations as TranslationKey)}
            </h2>
            <StaggerContainer className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerMs={60}>
              {insights.recommendations.map((card, i) => (
                <RecommendationCard key={i} card={card} />
              ))}
            </StaggerContainer>
          </div>
        </Reveal>
      )}

      {/* Forecast Trend Charts */}
      {forecast && (
        <Reveal delay={250}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-semibold text-mist-200">
                {normalizedPersonaId === "farmer" ? t("persona.charts.farmTemp") : t("home.tempTrend")}
              </h3>
              <WeatherChart hourly={forecast.hourly} variant="temperature" />
            </div>
            <div className="glass rounded-3xl p-6">
              <h3 className="mb-2 text-sm font-semibold text-mist-200">
                {normalizedPersonaId === "farmer" ? t("persona.charts.farmRain") : t("home.rainProb")}
              </h3>
              <WeatherChart hourly={forecast.hourly} variant="rain" />
            </div>
          </div>
        </Reveal>
      )}

      {/* Hourly Forecast */}
      {forecast && (
        <Reveal delay={300}>
          <HourlyForecast hourly={forecast.hourly} />
        </Reveal>
      )}

      {/* Multi-day Forecast */}
      {forecast && (
        <Reveal delay={350}>
          <div>
            {normalizedPersonaId === "farmer" && (
              <h2 className="mb-3 text-sm font-semibold text-mist-200">{t("persona.term.dailyOutlook")}</h2>
            )}
            <DailyForecast daily={forecast.daily} />
          </div>
        </Reveal>
      )}

      {/* Astronomy & Marine */}
      {astronomy && (
        <Reveal delay={400}>
          <SunMoonCard data={astronomy} />
        </Reveal>
      )}

      {marine && marine.available && (
        <Reveal delay={450}>
          <MarineCard data={marine} />
        </Reveal>
      )}
    </div>
  );
}
