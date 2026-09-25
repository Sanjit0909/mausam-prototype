"use client";

import { Sun } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";

function uvMeta(uv: number | null | undefined): { label: string; sublabel: string; color: string } {
  if (uv === null || uv === undefined) return { label: "Low", sublabel: "Low right now", color: "text-emerald-300" };
  if (uv < 3) return { label: "Low", sublabel: "Low right now", color: "text-emerald-300" };
  if (uv < 6) return { label: "Moderate", sublabel: "Moderate right now", color: "text-amber-300" };
  if (uv < 8) return { label: "High", sublabel: "High right now", color: "text-amber-400" };
  if (uv < 11) return { label: "Very High", sublabel: "Very high right now", color: "text-rose-400" };
  return { label: "Extreme", sublabel: "Extreme risk right now", color: "text-purple-400" };
}

export function UVCard({
  uvIndex = 7,
  onActivate,
}: {
  uvIndex: number | null | undefined;
  reason?: string;
  onActivate?: () => void;
}) {
  const { t, locale } = useLanguage();
  const safeUv = uvIndex ?? 7;
  const meta = uvMeta(safeUv);
  const pct = Math.max(8, Math.min(92, (safeUv / 11) * 100));

  return (
    <div
      className="glass group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/40"
      onClick={onActivate}
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white dark:text-sky-400 drop-shadow-sm">
            <Sun className="h-3.5 w-3.5 text-amber-300" />
            <span>{t("home.uvIndex")}</span>
          </span>
          <span className="text-[11px] text-white/70 dark:text-neutral-400">
            {locale === "hi" ? "यूवी इंडेक्स" : meta.sublabel}
          </span>
        </div>

        <p className="mt-2 text-2xl font-bold tracking-tight text-white">
          {meta.label} <span className="text-sm font-normal text-white/70">({safeUv.toFixed(0)})</span>
        </p>
      </div>

      {/* Gradient Spectrum Slider with Marker Node (Direct Reference from Screenshot) */}
      <div className="mt-4 mb-1">
        <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 via-rose-500 to-purple-600 shadow-sm">
          {/* Circular thumb indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-white border-2 border-amber-400 shadow-md transition-all duration-500"
            style={{ left: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
