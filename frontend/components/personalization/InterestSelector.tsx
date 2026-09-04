"use client";

import { Baby, Bike, Briefcase, Calendar, Car, HeartPulse, PersonStanding, Sprout, Waves } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { InterestKey } from "@/lib/types";

interface InterestOption {
  key: InterestKey;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof HeartPulse;
}

export const INTEREST_OPTIONS: InterestOption[] = [
  { key: "health", labelKey: "interest.health", descriptionKey: "interest.health.desc", icon: HeartPulse },
  { key: "outdoor_fitness", labelKey: "interest.outdoor_fitness", descriptionKey: "interest.outdoor_fitness.desc", icon: Bike },
  { key: "travel", labelKey: "interest.travel", descriptionKey: "interest.travel.desc", icon: Briefcase },
  { key: "family", labelKey: "interest.family", descriptionKey: "interest.family.desc", icon: Baby },
  { key: "agriculture", labelKey: "interest.agriculture", descriptionKey: "interest.agriculture.desc", icon: Sprout },
  { key: "commuting", labelKey: "interest.commuting", descriptionKey: "interest.commuting.desc", icon: Car },
  { key: "marine_beach", labelKey: "interest.marine_beach", descriptionKey: "interest.marine_beach.desc", icon: Waves },
  { key: "events", labelKey: "interest.events", descriptionKey: "interest.events.desc", icon: Calendar },
  { key: "elderly", labelKey: "interest.elderly", descriptionKey: "interest.elderly.desc", icon: PersonStanding },
];

interface InterestSelectorProps {
  selected: InterestKey[];
  onToggle: (key: InterestKey) => void;
}

export function InterestSelector({ selected, onToggle }: InterestSelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {INTEREST_OPTIONS.map((opt) => {
        const active = selected.includes(opt.key);
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onToggle(opt.key)}
            className={`glass-hover flex min-h-[7.5rem] flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-colors ${
              active ? "border-sky-400/60 bg-sky-500/10" : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className={`rounded-xl p-2 ${active ? "bg-sky-400/20" : "bg-white/5"}`}>
              <Icon className={`h-5 w-5 ${active ? "text-sky-300" : "text-mist-400"}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${active ? "text-mist-100" : "text-mist-300"}`}>{t(opt.labelKey)}</p>
              <p className="mt-0.5 text-xs text-mist-400">{t(opt.descriptionKey)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
