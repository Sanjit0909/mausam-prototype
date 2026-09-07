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
  const isHighSeverity = top.severity === "severe" || top.severity === "extreme";

  return (
    <Link
      href="/alerts"
      className={`glass group flex items-center gap-3 rounded-2xl border px-5 py-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        isHighSeverity
          ? "border-rose-500/40 bg-rose-500/[0.08] animate-severe-breath"
          : "border-amber-500/30 bg-amber-500/[0.06] hover:border-amber-400/40"
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 shrink-0 transition-transform group-hover:scale-105">
        <TriangleAlert className="h-5 w-5 text-rose-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300 border border-rose-500/30">
            {top.severity}
          </span>
          <p className="truncate text-sm font-semibold text-mist-100">{title}</p>
        </div>
        <p className="truncate text-xs text-mist-400 mt-0.5">
          {extra > 0
            ? extra === 1
              ? t("alerts.moreOne", { count: extra })
              : t("alerts.moreMany", { count: extra })
            : t("alerts.tapDetails")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-mist-400 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function severityRank(s: string): number {
  return { extreme: 4, severe: 3, moderate: 2, minor: 1 }[s] ?? 0;
}
