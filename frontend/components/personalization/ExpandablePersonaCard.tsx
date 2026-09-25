"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Car,
  ChevronDown,
  CloudRain,
  Droplets,
  ExternalLink,
  Eye,
  HeartPulse,
  Info,
  Leaf,
  Navigation,
  Package,
  Pin,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Tent,
  Thermometer,
  Umbrella,
  Users,
  Waves,
  Wind,
} from "lucide-react";
import { DataSourceBadge, type DataSourceType } from "@/components/common/DataSourceBadge";
import { WhyThisCardModal } from "@/components/personalization/WhyThisCardModal";
import { useLanguage } from "@/context/LanguageContext";
import { localizePersonaCardText } from "@/lib/i18n/localizePersona";
import type { ScoreBreakdown } from "@/lib/personalization/rankingEngine";
import type { PersonaCard } from "@/lib/types";

const CARD_ICONS: Record<string, typeof Sprout> = {
  // Farmer
  crop_stage: Sprout,
  agromet_advisory: Leaf,
  spraying_window: Droplets,
  irrigation: Droplets,
  soil_moisture: Droplets,
  crop_risk_rain: CloudRain,
  crop_risk_heat: Thermometer,
  crop_risk_humidity: Droplets,
  crop_risk_wind: Wind,
  crop_risk_frost: Thermometer,
  crop_risk_ok: Leaf,
  farm_forecast: Umbrella,

  // Runner
  best_run_time: Sun,
  heat_humidity: Thermometer,
  aqi: Wind,
  uv: Sun,
  rain: CloudRain,
  wind: Wind,
  hydration: Droplets,
  hourly_run: Sun,

  // Commuter
  rush_hour_visibility: Navigation,
  waterlogging_risk: Waves,
  transit_disruption: Car,
  hourly_commute: Car,

  // Health
  aqi_breakdown: Wind,
  respiratory_risk: HeartPulse,
  extreme_temp: Thermometer,

  // Traveler
  travel_risk: ShieldAlert,
  sightseeing_window: Sun,
  hourly_travel: Umbrella,
  packing: Package,

  // Family
  school_readiness: Users,
  outdoor_play: Sun,
  child_clothing: Package,

  // Marine
  tides_swell: Waves,
  sea_state: Waves,
  fisherman_warning: AlertTriangle,

  // Event Planner
  hourly_rain_prob: CloudRain,
  canopy_wind_risk: Tent,
  guest_comfort: Sparkles,
  backup_trigger: Calendar,

  // General
  visibility: Eye,
  temperature: Thermometer,
};

function formatSupportValue(key: string, value: unknown, locale: string): string {
  const raw = String(value);
  if (locale !== "hi") return raw;
  if (
    key === "crop" ||
    key === "crop_stage" ||
    key === "crop_relevance" ||
    key === "crop_stage_relevance" ||
    key === "status"
  ) {
    return localizePersonaCardText(raw, locale);
  }
  return raw;
}

function formatSupportRows(
  data: Record<string, unknown>,
  locale: string
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (
      value == null ||
      key === "portal_url" ||
      key === "days" ||
      key === "windows" ||
      key === "items" ||
      key === "note"
    ) {
      continue;
    }
    if (typeof value === "object") continue;
    const label = localizePersonaCardText(key.replace(/_/g, " "), locale);
    rows.push({ label, value: formatSupportValue(key, value, locale) });
  }
  if (Array.isArray(data.days)) {
    rows.push({
      label: locale === "hi" ? "अगले दिन" : "Next days",
      value: `${(data.days as unknown[]).length}`,
    });
  }
  if (Array.isArray(data.windows) && (data.windows as unknown[]).length) {
    const times = (data.windows as Array<{ time?: string }>)
      .slice(0, 3)
      .map((w) => (w.time ? w.time.slice(11, 16) : ""))
      .filter(Boolean)
      .join(", ");
    if (times) {
      rows.push({ label: locale === "hi" ? "शीर्ष समय" : "Top windows", value: times });
    }
  }
  if (Array.isArray(data.items)) {
    rows.push({
      label: locale === "hi" ? "सामान" : "Pack items",
      value: (data.items as string[]).join(", "),
    });
  }
  return rows;
}

export interface ExpandablePersonaCardProps {
  card: PersonaCard;
  scoreBreakdown?: ScoreBreakdown | null;
  onTogglePin?: (cardId: string) => void;
  onHideCard?: (cardId: string) => void;
}

export function ExpandablePersonaCard({
  card,
  scoreBreakdown,
  onTogglePin,
  onHideCard,
}: ExpandablePersonaCardProps) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);

  const title = localizePersonaCardText(card.title, locale);
  const summary = localizePersonaCardText(card.summary, locale);
  const detail = localizePersonaCardText(card.detail, locale);
  const recommendation = localizePersonaCardText(card.recommendation, locale);
  const portal =
    typeof card.supporting_data?.portal_url === "string" ? card.supporting_data.portal_url : null;
  const Icon = CARD_ICONS[card.id] ?? (card.id.startsWith("crop_risk") ? AlertTriangle : Leaf);
  const supportRows = formatSupportRows(card.supporting_data || {}, locale);

  const isBestRunTime = card.id === "best_run_time";
  const isAgromet = card.id === "agromet_advisory" || card.id === "crop_stage";
  const isCommuteRush = card.id === "rush_hour_visibility" || card.id === "waterlogging_risk";

  // Map provenance to DataSourceType
  const dataSource: DataSourceType =
    card.provenance === "official"
      ? "live_imd"
      : card.provenance === "estimated"
      ? "model_estimated"
      : "imd_forecast";

  return (
    <>
      <div
        className={`glass group overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
          scoreBreakdown?.isPinned
            ? "border-sky-400/50 bg-sky-500/[0.06] shadow-[0_0_20px_rgba(56,189,248,0.12)]"
            : isBestRunTime
            ? "border-amber-400/35 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent shadow-[0_4px_25px_rgba(251,191,36,0.08)]"
            : isAgromet
            ? "border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent"
            : isCommuteRush
            ? "border-blue-400/35 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-transparent"
            : "border-white/10 hover:border-white/20"
        }`}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-1 sm:px-6">
          <div className="flex items-center gap-2 flex-wrap">
            <DataSourceBadge source={dataSource} />
            {scoreBreakdown?.isPinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                <Pin className="h-3 w-3 fill-sky-300" />
                {locale === "hi" ? "पिन किया गया" : "Pinned"}
              </span>
            )}
          </div>

          {/* Interactive "Why am I seeing this?" Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowWhyModal(true);
            }}
            className="flex items-center gap-1 rounded-full border border-white/20 dark:border-neutral-800 bg-white/15 dark:bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/90 dark:text-neutral-300 hover:border-white/40 dark:hover:border-sky-400/40 hover:text-white transition-all active:scale-95 shadow-sm"
            title="View deterministic multi-factor personalization ranking breakdown"
          >
            <Info className="h-3 w-3 text-sky-200 dark:text-sky-400" />
            <span>{locale === "hi" ? "यह क्यों?" : "Why this?"}</span>
            {scoreBreakdown && scoreBreakdown.totalScore > 0 && (
              <span className="font-mono text-white dark:text-sky-400 font-bold ml-0.5">
                {scoreBreakdown.totalScore}pt
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start gap-4 px-5 pt-2 pb-5 text-left transition-colors hover:bg-white/[0.04] sm:px-6"
        >
          <div
            className={`mt-0.5 rounded-2xl p-2.5 shrink-0 transition-transform duration-300 group-hover:scale-105 ${
              scoreBreakdown?.isPinned
                ? "bg-sky-500/25 text-white dark:text-sky-300"
                : isBestRunTime
                ? "bg-amber-400/25 text-white dark:text-amber-300"
                : isAgromet
                ? "bg-emerald-400/25 text-white dark:text-emerald-300"
                : isCommuteRush
                ? "bg-blue-400/25 text-white dark:text-blue-300"
                : "bg-white/15 text-white dark:text-sky-300"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-white transition-colors">
                {title}
              </h3>
              {isBestRunTime && (
                <span className="rounded-full bg-amber-400/25 border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 dark:text-amber-300 animate-pulse [animation-duration:3s]">
                  Optimal Window
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-white/85 dark:text-neutral-300">{summary}</p>
            <p className="mt-2 text-[11px] text-white/60 dark:text-neutral-400 transition-colors group-hover:text-white/80">
              {t("persona.tapExpand")}
            </p>
          </div>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-white/70 dark:text-neutral-400 transition-transform duration-300 ${
              open ? "rotate-180 text-white dark:text-sky-300" : ""
            }`}
          />
        </button>

        {open && (
          <div className="space-y-4 border-t border-white/10 dark:border-white/5 px-5 py-5 text-sm text-white/90 dark:text-neutral-300 sm:px-6 animate-in fade-in slide-in-from-top-2 duration-200">
            {detail && (
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/60 dark:text-neutral-400">{t("persona.explanation")}</p>
                <p className="mt-1 leading-relaxed text-white/90 dark:text-neutral-200">{detail}</p>
              </div>
            )}
            {recommendation && (
              <div className="rounded-2xl bg-white/15 dark:bg-sky-500/10 border border-white/20 dark:border-sky-500/20 px-4 py-3 text-white dark:text-neutral-100">
                <p className="text-[10px] uppercase font-bold tracking-wider text-sky-200 dark:text-sky-400/80">{t("persona.recommendation")}</p>
                <p className="mt-1 leading-relaxed">{recommendation}</p>
              </div>
            )}
            {supportRows.length > 0 && (
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-white/60 dark:text-neutral-400">{t("persona.supportingData")}</p>
                <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {supportRows.map((row) => (
                    <div key={row.label} className="rounded-xl bg-white/10 dark:bg-white/[0.04] border border-white/10 dark:border-white/5 px-3 py-2">
                      <dt className="text-[10px] uppercase font-medium tracking-wide text-white/70 dark:text-neutral-400">{row.label}</dt>
                      <dd className="mt-0.5 text-white dark:text-neutral-100 font-semibold break-words">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <DataSourceBadge
                source={dataSource}
                stationName={card.source_label}
              />
              {portal && (
                <a
                  href={portal}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-sky-200 dark:text-sky-400 hover:text-white"
                >
                  {t("persona.openOfficialPortal")} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Why Am I Seeing This Modal */}
      <WhyThisCardModal
        breakdown={scoreBreakdown || null}
        cardTitle={title}
        isOpen={showWhyModal}
        onClose={() => setShowWhyModal(false)}
        onTogglePin={onTogglePin ? () => onTogglePin(card.id) : undefined}
        onHide={onHideCard ? () => onHideCard(card.id) : undefined}
      />
    </>
  );
}
