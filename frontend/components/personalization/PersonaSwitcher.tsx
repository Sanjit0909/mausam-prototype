"use client";

import { useState } from "react";
import { Bike, Briefcase, Sparkles, Sprout, Waves } from "lucide-react";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { InterestKey, LocationInfo } from "@/lib/types";

interface DemoPersona {
  key: InterestKey;
  labelKey: TranslationKey;
  icon: typeof Bike;
  location: LocationInfo;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    key: "outdoor_fitness",
    labelKey: "persona.runner",
    icon: Bike,
    location: { name: "Mumbai", country: "India", admin1: "Maharashtra", lat: 19.076, lon: 72.8777 },
  },
  {
    key: "agriculture",
    labelKey: "persona.farmer",
    icon: Sprout,
    location: { name: "Solapur", country: "India", admin1: "Maharashtra", lat: 17.6599, lon: 75.9064 },
  },
  {
    key: "travel",
    labelKey: "persona.traveler",
    icon: Briefcase,
    location: { name: "New Delhi", country: "India", admin1: "Delhi", lat: 28.6139, lon: 77.209 },
  },
  {
    key: "marine_beach",
    labelKey: "persona.fisherman",
    icon: Waves,
    location: { name: "Kochi", country: "India", admin1: "Kerala", lat: 9.9312, lon: 76.2673 },
  },
];

/** One-click demo profile switcher (spec section 19). Instantly re-personalizes the whole
 * homepage - both interests AND location change together - to visibly demonstrate that the
 * same product adapts to who's using it, without needing to click through the full profile
 * editor. Styled as a first-class feature, not a debug tool. */
export function PersonaSwitcher() {
  const { setLocation } = useLocation();
  const { updatePreferences } = usePreferences();
  const { t } = useLanguage();
  const [active, setActive] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const handleSwitch = async (persona: DemoPersona) => {
    setSwitching(true);
    setActive(persona.key);
    setLocation(persona.location);
    await updatePreferences({ interests: [persona.key] });
    setSwitching(false);
  };

  return (
    <div className="glass rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-mist-500">
        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
        {t("persona.switch")}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEMO_PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isActive = active === persona.key;
          return (
            <button
              key={persona.key}
              onClick={() => handleSwitch(persona)}
              disabled={switching}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                isActive
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-300"
                  : "border-white/10 bg-white/[0.03] text-mist-300 hover:bg-white/10"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(persona.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
