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
      className="glass glass-hover flex min-h-[8.5rem] cursor-pointer flex-col gap-3 rounded-3xl p-4 sm:p-5"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{t("home.aqi")}</span>
        <Wind className={`h-4 w-4 ${aqiColor(aqi)}`} />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-2xl font-semibold ${aqiColor(aqi)}`}>{aqi ?? "--"}</p>
          <p className="mt-1 text-xs text-mist-400">{localizeAqiCategory(data.category, locale)}</p>
        </div>
        {data.pm2_5 !== null && data.pm2_5 !== undefined && (
          <p className="text-xs text-mist-400">PM2.5: {data.pm2_5.toFixed(0)} µg/m³</p>
        )}
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div
          className={`h-1.5 rounded-full ${aqiColor(aqi).replace("text-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <SourceBadge provider={providerDisplayName(data.source)} kind={t("common.kind.aqi")} />
      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
