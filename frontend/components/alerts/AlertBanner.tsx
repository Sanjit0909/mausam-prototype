"use client";

import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { localizeAlertTitle } from "@/lib/i18n/localizeAlert";
import type { WeatherAlert } from "@/lib/types";

export function AlertBanner({ alerts }: { alerts: WeatherAlert[] }) {
  const { t, locale } = useLanguage();
  if (alerts.length === 0) return null;

  const top = [...alerts].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0];
  const extra = alerts.length - 1;
  const title = localizeAlertTitle(top.title, locale);
  const isExtreme = top.severity === "extreme";
  const isSevere = top.severity === "severe";
  const isModerate = top.severity === "moderate";

  // Color schemes according to official IMD 4-tier warning system: Red, Orange, Yellow, Green
  const colorClasses = isExtreme || isSevere
    ? "border-rose-500/60 bg-rose-500/10 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.15)]"
    : isModerate
    ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";

  const badgeColor = isExtreme || isSevere
    ? "bg-rose-500 text-white"
    : isModerate
    ? "bg-amber-500 text-navy-950 font-bold"
    : "bg-yellow-400 text-navy-950 font-bold";

  return (
    <div className="space-y-1" role="alert" aria-live="assertive">
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-rose-400 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          {locale === "hi" ? "आधिकारिक आईएमडी मौसम चेतावनी" : "OFFICIAL IMD WEATHER WARNING"}
        </span>
        <span className="text-[10px] text-mist-400">
          {locale === "hi" ? "प्राथमिक सुरक्षा अलर्ट" : "Priority Safety Anchor"}
        </span>
      </div>

      <Link
        href="/alerts"
        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${colorClasses}`}
      >
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-transform group-hover:scale-105 ${
          isExtreme || isSevere ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"
        }`}>
          <TriangleAlert className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
              {top.severity === "extreme"
                ? locale === "hi" ? "लाल अलर्ट (रेड)" : "RED ALERT"
                : top.severity === "severe"
                ? locale === "hi" ? "नारंगी अलर्ट (ऑरेंज)" : "ORANGE ALERT"
                : locale === "hi" ? "पीला अलर्ट (येलो)" : "YELLOW ALERT"}
            </span>
            <p className="truncate text-sm font-bold text-white">{title}</p>
          </div>
          <p className="truncate text-xs text-mist-300 mt-1">
            {top.description || (extra > 0
              ? extra === 1
                ? t("alerts.moreOne", { count: extra })
                : t("alerts.moreMany", { count: extra })
              : t("alerts.tapDetails"))}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-mist-400 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function severityRank(s: string): number {
  return { extreme: 4, severe: 3, moderate: 2, minor: 1 }[s] ?? 0;
}
