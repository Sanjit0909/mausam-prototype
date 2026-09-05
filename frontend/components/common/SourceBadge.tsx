"use client";

import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface SourceBadgeProps {
  /** e.g. "IMD", "Open-Meteo", "OpenWeatherMap", "Stormglass", "MAUSAM Advisory" */
  provider: string;
  /** e.g. "Official Warning", "Forecast", "AQI", "Marine" */
  kind?: string;
  /** ISO timestamp this data was issued/observed - renders as a relative "Updated Xm ago". */
  updatedAt?: string | null;
  official?: boolean;
  className?: string;
}

/** Reusable data-provenance label (spec section 21): "[Provider - Kind]" + freshness. Never
 * invents a provider name - always renders exactly what the backend reported as `source`. */
export function SourceBadge({ provider, kind, updatedAt, official = false, className = "" }: SourceBadgeProps) {
  const { t } = useLanguage();

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

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        official ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-mist-400"
      } ${className}`}
    >
      {official && <ShieldCheck className="h-3 w-3" />}
      <span>
        {provider}
        {kind ? ` \u2022 ${kind}` : ""}
      </span>
      {ago && <span className="opacity-70">\u00b7 {ago}</span>}
    </span>
  );
}
