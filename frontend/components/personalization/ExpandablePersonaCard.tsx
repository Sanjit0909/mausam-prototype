"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  CloudRain,
  Droplets,
  ExternalLink,
  Eye,
  Leaf,
  Package,
  ShieldAlert,
  Sprout,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
} from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { WhyThis } from "@/components/common/WhyThis";
import { useLanguage } from "@/context/LanguageContext";
import { localizePersonaCardText } from "@/lib/i18n/localizePersona";
import type { PersonaCard } from "@/lib/types";

const PROVENANCE_KEY: Record<
  string,
  | "persona.provenance.official"
  | "persona.provenance.derived"
  | "persona.provenance.estimated"
  | "persona.provenance.unavailable"
> = {
  official: "persona.provenance.official",
  derived: "persona.provenance.derived",
  estimated: "persona.provenance.estimated",
  unavailable: "persona.provenance.unavailable",
};

const CARD_ICONS: Record<string, typeof Sprout> = {
  crop_stage: Sprout,
  agromet_advisory: Leaf,
  irrigation: Droplets,
  soil_moisture: Droplets,
  crop_risk_rain: CloudRain,
  crop_risk_heat: Thermometer,
  crop_risk_humidity: Droplets,
  crop_risk_wind: Wind,
  crop_risk_frost: Thermometer,
  crop_risk_ok: Leaf,
  farm_forecast: Umbrella,
  best_run_time: Sun,
  heat_humidity: Thermometer,
  aqi: Wind,
  uv: Sun,
  rain: CloudRain,
  wind: Wind,
  hydration: Droplets,
  hourly_run: Sun,
  travel_risk: ShieldAlert,
  visibility: Eye,
  temperature: Thermometer,
  hourly_travel: Umbrella,
  packing: Package,
};

function formatSupportRows(
  data: Record<string, unknown>,
  locale: string
): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (value == null || key === "portal_url" || key === "days" || key === "windows" || key === "items" || key === "note") {
      continue;
    }
    if (typeof value === "object") continue;
    const label = localizePersonaCardText(key.replace(/_/g, " "), locale);
    rows.push({ label, value: String(value) });
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

export function ExpandablePersonaCard({ card }: { card: PersonaCard }) {
  const { t, locale } = useLanguage();
  const [open, setOpen] = useState(false);
  const title = localizePersonaCardText(card.title, locale);
  const summary = localizePersonaCardText(card.summary, locale);
  const detail = localizePersonaCardText(card.detail, locale);
  const recommendation = localizePersonaCardText(card.recommendation, locale);
  const portal =
    typeof card.supporting_data?.portal_url === "string" ? card.supporting_data.portal_url : null;
  const Icon = CARD_ICONS[card.id] ?? (card.id.startsWith("crop_risk") ? AlertTriangle : Leaf);
  const supportRows = formatSupportRows(card.supporting_data || {}, locale);

  return (
    <div className="glass overflow-hidden rounded-3xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.03] sm:px-6"
      >
        <div className="mt-0.5 rounded-2xl bg-sky-500/10 p-2.5 shrink-0">
          <Icon className="h-5 w-5 text-sky-300" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-mist-100">{title}</h3>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mist-300">
              {t(PROVENANCE_KEY[card.provenance] ?? "persona.provenance.derived")}
            </span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-mist-300">{summary}</p>
          <p className="mt-2 text-[11px] text-mist-500">{t("persona.tapExpand")}</p>
        </div>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-mist-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/5 px-5 py-5 text-sm text-mist-300 sm:px-6">
          {detail && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-mist-500">{t("persona.explanation")}</p>
              <p className="mt-1 leading-relaxed text-mist-200">{detail}</p>
            </div>
          )}
          {recommendation && (
            <div className="rounded-2xl bg-sky-500/10 px-4 py-3 text-mist-100">
              <p className="text-[10px] uppercase tracking-wide text-sky-400/80">{t("persona.recommendation")}</p>
              <p className="mt-1 leading-relaxed">{recommendation}</p>
            </div>
          )}
          {supportRows.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-mist-500">{t("persona.supportingData")}</p>
              <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {supportRows.map((row) => (
                  <div key={row.label} className="rounded-xl bg-black/20 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wide text-mist-500">{row.label}</dt>
                    <dd className="mt-0.5 text-mist-200 break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <SourceBadge
              provider={localizePersonaCardText(card.source_label, locale)}
              updatedAt={card.updated_at || card.issued_at || undefined}
              official={card.provenance === "official"}
            />
            {portal && (
              <a
                href={portal}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
              >
                {t("persona.openOfficialPortal")} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {card.reason && <WhyThis reason={card.reason} label={card.label} />}
        </div>
      )}
    </div>
  );
}
