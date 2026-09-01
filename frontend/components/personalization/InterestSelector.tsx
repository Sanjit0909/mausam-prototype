"use client";

import { Baby, Bike, Briefcase, Calendar, Car, HeartPulse, Sprout, Waves } from "lucide-react";
import type { InterestKey } from "@/lib/types";

interface InterestOption {
  key: InterestKey;
  label: string;
  description: string;
  icon: typeof HeartPulse;
}

export const INTEREST_OPTIONS: InterestOption[] = [
  { key: "health", label: "Health", description: "AQI, UV & comfort tracking", icon: HeartPulse },
  { key: "outdoor_fitness", label: "Outdoor Fitness", description: "Best time to run or train", icon: Bike },
  { key: "travel", label: "Travel", description: "Destination forecasts & packing", icon: Briefcase },
  { key: "family", label: "Family", description: "Commute & school-day conditions", icon: Baby },
  { key: "agriculture", label: "Agriculture", description: "Rainfall, frost & field conditions", icon: Sprout },
  { key: "commuting", label: "Commuting", description: "Rain, wind & visibility on the go", icon: Car },
  { key: "marine_beach", label: "Marine / Beach", description: "Waves, tides & wind", icon: Waves },
  { key: "events", label: "Events", description: "Outdoor comfort planning", icon: Calendar },
];

interface InterestSelectorProps {
  selected: InterestKey[];
  onToggle: (key: InterestKey) => void;
}

export function InterestSelector({ selected, onToggle }: InterestSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {INTEREST_OPTIONS.map((opt) => {
        const active = selected.includes(opt.key);
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onToggle(opt.key)}
            className={`glass-hover flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
              active ? "border-sky-400/60 bg-sky-500/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className={`rounded-xl p-2 ${active ? "bg-sky-400/20" : "bg-white/5"}`}>
              <Icon className={`h-5 w-5 ${active ? "text-sky-300" : "text-mist-400"}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${active ? "text-mist-100" : "text-mist-300"}`}>{opt.label}</p>
              <p className="text-xs text-mist-400 mt-0.5">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
