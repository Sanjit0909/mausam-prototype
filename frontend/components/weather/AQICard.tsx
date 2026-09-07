"use client";

import { Wind } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { WhyThis } from "@/components/common/WhyThis";
import { useLanguage } from "@/context/LanguageContext";
import { localizeAqiCategory } from "@/lib/i18n/localizeWeather";
import { aqiColor, providerDisplayName } from "@/lib/utils/format";
import type { AirQualityResponse } from "@/lib/types";

export function AQICard({
  data,
  reason,
  onActivate,
}: {
  data: AirQualityResponse;
  reason?: string;
  onActivate?: () => void;
}) {
  const { t, locale } = useLanguage();
  const aqi = data.us_aqi ?? null;
  const pct = aqi !== null ? Math.min(100, (aqi / 300) * 100) : 0;

  return (
    <div
      className="glass group relative flex min-h-[8.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-[0_12px_35px_rgba(0,0,0,0.45),0_0_20px_rgba(56,189,248,0.08)]"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400 transition-colors group-hover:text-mist-200">
          {t("home.aqi")}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] transition-all duration-300 group-hover:bg-white/[0.08] group-hover:scale-105">
          <Wind className={`h-4 w-4 ${aqiColor(aqi)} transition-transform duration-300 group-hover:scale-110`} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className={`text-2xl font-semibold transition-all ${aqiColor(aqi)}`}>{aqi ?? "--"}</p>
            <p className="mt-0.5 text-xs text-mist-400">{localizeAqiCategory(data.category, locale)}</p>
          </div>
          {data.pm2_5 !== null && data.pm2_5 !== undefined && (
            <p className="text-[11px] text-mist-400 font-mono">PM2.5: {data.pm2_5.toFixed(0)}</p>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${aqiColor(aqi).replace("text-", "bg-")}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <SourceBadge provider={providerDisplayName(data.source)} kind={t("common.kind.aqi")} />
      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
