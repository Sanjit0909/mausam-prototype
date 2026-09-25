"use client";

import { Moon, Sunrise, Sunset } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { localizeMoonPhase } from "@/lib/i18n/localizeWeather";
import { formatTime } from "@/lib/utils/format";
import type { AstronomyResponse } from "@/lib/types";

export function SunMoonCard({ data }: { data: AstronomyResponse }) {
  const { t, locale } = useLanguage();
  const moonPhase = localizeMoonPhase(data.moon_phase, locale);
  return (
    <div className="glass glass-hover flex flex-col gap-4 rounded-3xl p-5">
      <span className="text-xs font-bold uppercase tracking-wider text-sky-200 dark:text-sky-400">{t("home.sunMoon")}</span>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 shrink-0">
            <Sunrise className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {formatTime(data.sunrise, data.location.timezone, locale)}
            </p>
            <p className="text-[11px] font-medium text-white/80 dark:text-neutral-400">{t("home.sunrise")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
            <Sunset className="h-4 w-4 text-rose-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {formatTime(data.sunset, data.location.timezone, locale)}
            </p>
            <p className="text-[11px] font-medium text-white/80 dark:text-neutral-400">{t("home.sunset")}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/10 dark:border-white/5 pt-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-sky-200 shrink-0">
          <Moon className="h-4 w-4 text-sky-200 dark:text-sky-300" />
        </div>
        <div>
          <p className="text-sm font-medium text-white dark:text-neutral-200">
            {t("home.moonLit", { phase: moonPhase, pct: data.moon_illumination.toFixed(0) })}
          </p>
          <p className="text-[11px] text-white/70 dark:text-neutral-400">{t("home.moonUnavailable")}</p>
        </div>
      </div>
    </div>
  );
}
