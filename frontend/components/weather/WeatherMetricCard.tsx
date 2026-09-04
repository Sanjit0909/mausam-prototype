"use client";

import type { LucideIcon } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";

interface WeatherMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accentClassName?: string;
  reason?: string;
  onActivate?: () => void;
}

export function WeatherMetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accentClassName = "text-sky-400",
  reason,
  onActivate,
}: WeatherMetricCardProps) {
  return (
    <div
      className="glass glass-hover flex min-h-[8.5rem] cursor-pointer flex-col gap-3 rounded-3xl p-4 sm:p-5"
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
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{label}</span>
        <Icon className={`h-4 w-4 ${accentClassName}`} />
      </div>
      <div>
        <p className="text-xl font-semibold text-mist-100 sm:text-2xl">{value}</p>
        {sublabel && <p className="mt-1 text-xs text-mist-400">{sublabel}</p>}
      </div>
      {reason && <WhyThis reason={reason} />}
    </div>
  );
}
