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
      className="glass glass-hover flex min-h-[8.5rem] cursor-pointer flex-col gap-3 rounded-3xl p-4 sm:p-5"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{t("home.uvIndex")}</span>
        <Sun className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className={`text-2xl font-semibold ${color}`}>
          {uvIndex !== null && uvIndex !== undefined ? uvIndex.toFixed(0) : "--"}
        </p>
        <p className="mt-1 text-xs text-mist-400">{labelKey ? t(labelKey) : "--"}</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div className={`h-1.5 rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
