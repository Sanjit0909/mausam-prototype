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

  return (
    <Link
      href="/alerts"
      className="glass glass-hover flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-5 py-3 animate-fade-in-up"
    >
      <TriangleAlert className="h-5 w-5 shrink-0 text-rose-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-mist-100">{title}</p>
        <p className="truncate text-xs text-mist-400">
          {extra > 0
            ? extra === 1
              ? t("alerts.moreOne", { count: extra })
              : t("alerts.moreMany", { count: extra })
            : t("alerts.tapDetails")}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-mist-400" />
    </Link>
  );
}

function severityRank(s: string): number {
  return { extreme: 4, severe: 3, moderate: 2, minor: 1 }[s] ?? 0;
}
