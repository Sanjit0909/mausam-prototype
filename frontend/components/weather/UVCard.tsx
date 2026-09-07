"use client";

import { Sun } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

function uvMeta(uv: number | null | undefined): { labelKey: TranslationKey | null; color: string } {
  if (uv === null || uv === undefined) return { labelKey: null, color: "text-mist-400" };
  if (uv < 3) return { labelKey: "common.uv.low", color: "text-emerald-400" };
  if (uv < 6) return { labelKey: "common.uv.moderate", color: "text-amber-300" };
  if (uv < 8) return { labelKey: "common.uv.high", color: "text-amber-500" };
  if (uv < 11) return { labelKey: "common.uv.veryHigh", color: "text-rose-400" };
  return { labelKey: "common.uv.extreme", color: "text-rose-600" };
}

export function UVCard({
  uvIndex,
  reason,
  onActivate,
}: {
  uvIndex: number | null | undefined;
  reason?: string;
  onActivate?: () => void;
}) {
  const { t } = useLanguage();
  const { labelKey, color } = uvMeta(uvIndex);
  const pct = uvIndex !== null && uvIndex !== undefined ? Math.min(100, (uvIndex / 11) * 100) : 0;

  return (
    <div
      className="glass group relative flex min-h-[8.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-[0_12px_35px_rgba(0,0,0,0.45),0_0_20px_rgba(56,189,248,0.08)]"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400 transition-colors group-hover:text-mist-200">
          {t("home.uvIndex")}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] transition-all duration-300 group-hover:bg-white/[0.08] group-hover:scale-105">
          <Sun className={`h-4 w-4 ${color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-45`} />
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <p className={`text-2xl font-semibold transition-all ${color}`}>
            {uvIndex !== null && uvIndex !== undefined ? uvIndex.toFixed(0) : "--"}
          </p>
          <p className="mt-0.5 text-xs text-mist-400">{labelKey ? t(labelKey) : "--"}</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${color.replace("text-", "bg-")}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
