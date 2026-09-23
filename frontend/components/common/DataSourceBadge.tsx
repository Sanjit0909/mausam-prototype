"use client";

import { ShieldCheck, Cpu, Radio, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export type DataSourceType = "live_imd" | "imd_forecast" | "model_estimated" | "demo_simulated";

interface DataSourceBadgeProps {
  source: DataSourceType;
  stationName?: string;
  className?: string;
  showTooltip?: boolean;
}

export function DataSourceBadge({
  source,
  stationName,
  className = "",
}: DataSourceBadgeProps) {
  const { locale } = useLanguage();

  switch (source) {
    case "live_imd":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 shadow-sm ${className}`}
          title={stationName ? `IMD Station: ${stationName}` : "Official India Meteorological Department Telemetry"}
        >
          <Radio className="h-3 w-3 animate-pulse text-emerald-400" />
          <span>{locale === "hi" ? "लाइव आईएमडी" : "LIVE IMD"}</span>
          {stationName && <span className="opacity-70 text-[10px]">({stationName})</span>}
        </span>
      );

    case "imd_forecast":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-300 shadow-sm ${className}`}
          title="Official IMD Gridded / District Meteorological Bulletin"
        >
          <ShieldCheck className="h-3 w-3 text-sky-400" />
          <span>{locale === "hi" ? "आईएमडी पूर्वानुमान" : "IMD FORECAST"}</span>
        </span>
      );

    case "model_estimated":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-300 shadow-sm ${className}`}
          title="Scientific Model-Estimated (Open-Meteo / ECMWF Numerical Weather Prediction)"
        >
          <Cpu className="h-3 w-3 text-purple-400" />
          <span>{locale === "hi" ? "मॉडल-अनुमानित" : "MODEL-ESTIMATED"}</span>
        </span>
      );

    case "demo_simulated":
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 shadow-sm ${className}`}
          title="Simulated Demo Scenario for SIH 2026 Evaluation"
        >
          <Sparkles className="h-3 w-3 text-amber-400" />
          <span>{locale === "hi" ? "डेमो परिदृश्य" : "DEMO SIMULATED"}</span>
        </span>
      );
  }
}
