"use client";

import { Clock, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DataFreshnessProps {
  updatedAt?: string | null;
  stationName?: string | null;
  isFallback?: boolean;
  className?: string;
}

export function DataFreshness({
  updatedAt,
  stationName,
  isFallback = false,
  className = "",
}: DataFreshnessProps) {
  const { locale } = useLanguage();

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
    : "Just now";

  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-mist-400 ${className}`}
    >
      <div className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5 opacity-70" />
        <span>
          {locale === "hi" ? "अद्यतन:" : "Observed:"} {formattedTime} IST
        </span>
      </div>

      {stationName && (
        <>
          <span className="opacity-40">•</span>
          <span className="truncate max-w-[200px]">
            {locale === "hi" ? "स्टेशन:" : "Station:"} {stationName}
          </span>
        </>
      )}

      {isFallback && (
        <>
          <span className="opacity-40">•</span>
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300 font-medium border border-amber-500/20">
            <Info className="h-3 w-3" />
            {locale === "hi"
              ? "आईएमडी बैकअप (ओपन-मेटियो मॉडल)"
              : "IMD Resilience Fallback Active"}
          </span>
        </>
      )}
    </div>
  );
}
