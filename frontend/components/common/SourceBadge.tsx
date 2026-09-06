"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SourceBadgeProps {
  /** e.g. "IMD", "Open-Meteo", "OpenWeatherMap", "Stormglass", "MAUSAM Advisory" */
  provider: string;
  /** e.g. "Forecast", "AQI", "Marine" */
  kind?: string;
  /** ISO timestamp this data was issued/observed - renders as a relative "Updated Xm ago". */
  updatedAt?: string | null;
  /**
   * Visual emphasis for authentic IMD provenance only.
   * Never set for NWS / Open-Meteo / derived advisories.
   */
  official?: boolean;
  className?: string;
}

function sourceLabel(provider: string, imdLabel: string, nwsLabel: string): string {
  const key = provider.trim().toLowerCase();
  // Only remap bare provider codes — never rewrite longer provenance phrases
  // (e.g. "MAUSAM derived (not IMD advisory)", "IMD Agromet (not connected)").
  if (key === "imd") return imdLabel;
  if (key === "nws") return nwsLabel;
  return provider;
}

/** Reusable data-provenance label: provider + optional kind + freshness.
 * Never invents a provider — renders what the backend reported, with accurate
 * “IMD source” / “NWS source” wording (no false “Official IMD” claims). */
export function SourceBadge({ provider, kind, updatedAt, official = false, className = "" }: SourceBadgeProps) {
  const { t } = useLanguage();
  const normalized = provider.trim().toLowerCase();
  const isImdOfficial = official && normalized.includes("imd");

  let ago = "";
  if (updatedAt) {
    const diffMs = Date.now() - new Date(updatedAt).getTime();
    if (!Number.isNaN(diffMs)) {
      const minutes = Math.round(diffMs / 60000);
      if (minutes < 1) ago = t("common.justNow");
      else if (minutes < 60) ago = t("common.minutesAgo", { n: minutes });
      else {
        const hours = Math.round(minutes / 60);
        if (hours < 24) ago = t("common.hoursAgo", { n: hours });
        else ago = t("common.daysAgo", { n: Math.round(hours / 24) });
      }
    }
  }

  const label = sourceLabel(provider, t("common.sourceImd"), t("common.sourceNws"));

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isImdOfficial
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-white/10 bg-white/5 text-mist-400"
      } ${className}`}
    >
      {isImdOfficial && <ShieldCheck className="h-3 w-3" />}
      <span>
        {label}
        {kind ? ` • ${kind}` : ""}
      </span>
      {ago && <span className="opacity-70"> · {ago}</span>}
    </span>
  );
}
