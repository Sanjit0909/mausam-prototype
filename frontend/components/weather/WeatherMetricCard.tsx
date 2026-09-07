"use client";

import type { LucideIcon } from "lucide-react";
import { Navigation } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";

interface WeatherMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accentClassName?: string;
  reason?: string;
  windDeg?: number | null;
  onActivate?: () => void;
}

export function WeatherMetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accentClassName = "text-sky-400",
  reason,
  windDeg,
  onActivate,
}: WeatherMetricCardProps) {
  return (
    <div
      className="glass group relative flex min-h-[8.5rem] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-[0_12px_35px_rgba(0,0,0,0.45),0_0_20px_rgba(56,189,248,0.08)]"
      onClick={onActivate}
      onKeyDown={
        onActivate
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
      role={onActivate ? "button" : undefined}
      tabIndex={onActivate ? 0 : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400 transition-colors group-hover:text-mist-200">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] transition-all duration-300 group-hover:bg-sky-500/10 group-hover:scale-105">
          <Icon className={`h-4 w-4 ${accentClassName} transition-transform duration-300 group-hover:scale-110`} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xl font-semibold text-mist-100 sm:text-2xl transition-all group-hover:text-white">
          {value}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {sublabel && <p className="text-xs text-mist-400">{sublabel}</p>}
          {windDeg != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-sky-300 border border-white/5">
              <Navigation
                className="h-2.5 w-2.5 text-sky-400 transition-transform duration-700 ease-out"
                style={{ transform: `rotate(${windDeg}deg)` }}
              />
              <span>{Math.round(windDeg)}°</span>
            </span>
          )}
        </div>
      </div>

      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
