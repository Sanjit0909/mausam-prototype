"use client";

import { Moon, Sunrise, Sunset } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { formatTime } from "@/lib/utils/format";
import type { AstronomyResponse } from "@/lib/types";

export function SunMoonCard({ data }: { data: AstronomyResponse }) {
  const { t } = useLanguage();
  return (
    <div className="glass glass-hover flex flex-col gap-4 rounded-3xl p-5">
      <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{t("home.sunMoon")}</span>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Sunrise className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-mist-100">{formatTime(data.sunrise, data.location.timezone)}</p>
            <p className="text-[11px] text-mist-400">{t("home.sunrise")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sunset className="h-5 w-5 text-rose-400" />
          <div>
            <p className="text-sm font-medium text-mist-100">{formatTime(data.sunset, data.location.timezone)}</p>
            <p className="text-[11px] text-mist-400">{t("home.sunset")}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 pt-3">
        <Moon className="h-5 w-5 text-mist-300" />
        <div>
          <p className="text-sm font-medium text-mist-100">
            {t("home.moonLit", { phase: data.moon_phase, pct: data.moon_illumination.toFixed(0) })}
          </p>
          <p className="text-[11px] text-mist-400">{t("home.moonUnavailable")}</p>
        </div>
      </div>
    </div>
  );
}
