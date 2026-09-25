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
  progress?: number;
  progressColor?: string;
  onActivate?: () => void;
}

export function WeatherMetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accentClassName = "text-sky-300 dark:text-sky-400",
  reason,
  windDeg,
  progress,
  progressColor,
  onActivate,
}: WeatherMetricCardProps) {
  return (
    <div
      className="glass group relative flex min-h-[9rem] cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/40 dark:hover:border-white/20 hover:shadow-[0_12px_35px_rgba(0,0,0,0.3)]"
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
        <span className="text-xs font-semibold uppercase tracking-wider text-white/75 dark:text-neutral-400 transition-colors group-hover:text-white dark:group-hover:text-neutral-200">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 dark:bg-white/[0.06] backdrop-blur-sm transition-all duration-300 group-hover:scale-105">
          <Icon className={`h-4 w-4 ${accentClassName} transition-transform duration-300 group-hover:scale-110`} />
        </div>
      </div>

      <div className="space-y-1.5 my-1">
        <p className="text-2xl font-bold tracking-tight text-white dark:text-white transition-all">
          {value}
        </p>

        {progress !== undefined && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20 dark:bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                progressColor || "bg-gradient-to-r from-sky-300 to-cyan-400"
              }`}
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {sublabel && (
            <p className="text-xs text-white/80 dark:text-neutral-400 leading-snug">
              {sublabel}
            </p>
          )}
          {windDeg != null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/15 dark:bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-white dark:text-sky-300 border border-white/20 dark:border-white/10">
              <Navigation
                className="h-2.5 w-2.5 text-sky-200 dark:text-sky-400 transition-transform duration-700 ease-out"
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
