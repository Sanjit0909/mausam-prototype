"use client";

import { useState } from "react";
import {
  Bike,
  Briefcase,
  Calendar,
  Car,
  HeartPulse,
  Sparkles,
  Sprout,
  Users,
  Waves,
} from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import type { InterestKey, PersonaProfile } from "@/lib/types";

interface DemoPersona {
  id: string;
  key: InterestKey;
  labelEn: string;
  labelHi: string;
  icon: typeof Bike;
  persona_profile: PersonaProfile;
}

const ALL_8_DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "runner",
    key: "outdoor_fitness",
    labelEn: "Runner / Fitness",
    labelHi: "धावक / फिटनेस",
    icon: Bike,
    persona_profile: { primary_persona: "runner" },
  },
  {
    id: "farmer-wheat",
    key: "agriculture",
    labelEn: "Farmer (Wheat)",
    labelHi: "किसान (गेहूं)",
    icon: Sprout,
    persona_profile: {
      primary_persona: "farmer",
      farmer: { crop: "wheat", crop_stage: "flowering", irrigation_type: "canal", field_size_ha: 2 },
    },
  },
  {
    id: "commuter",
    key: "commuting",
    labelEn: "Daily Commuter",
    labelHi: "दैनिक यात्री",
    icon: Car,
    persona_profile: { primary_persona: "family" },
  },
  {
    id: "health",
    key: "health",
    labelEn: "Health / Sensitive",
    labelHi: "स्वास्थ्य संवेदनशील",
    icon: HeartPulse,
    persona_profile: { primary_persona: "health_vulnerable" },
  },
  {
    id: "traveler",
    key: "travel",
    labelEn: "Traveler",
    labelHi: "पर्यटक / यात्री",
    icon: Briefcase,
    persona_profile: { primary_persona: "traveller" },
  },
  {
    id: "family",
    key: "family",
    labelEn: "Parent / Family",
    labelHi: "परिवार / अभिभावक",
    icon: Users,
    persona_profile: { primary_persona: "family" },
  },
  {
    id: "marine",
    key: "marine_beach",
    labelEn: "Marine / Beach",
    labelHi: "तटीय / मछुआरा",
    icon: Waves,
    persona_profile: { primary_persona: "marine" },
  },
  {
    id: "events",
    key: "events",
    labelEn: "Event Planner",
    labelHi: "इवेंट प्लानर",
    icon: Calendar,
    persona_profile: { primary_persona: "disaster" },
  },
];

export function PersonaSwitcher() {
  const { updatePreferences, preferences } = usePreferences();
  const { locale } = useLanguage();
  const currentInterest = preferences.interests[0] ?? "outdoor_fitness";
  const [active, setActive] = useState<string>(
    preferences.persona_profile?.primary_persona || "runner"
  );

  const handleSwitch = async (persona: DemoPersona) => {
    setActive(persona.id);
    void updatePreferences({
      interests: [persona.key],
      preferred_location: preferences.preferred_location,
      persona_profile: persona.persona_profile,
    });
  };

  return (
    <div className="glass rounded-3xl p-4 border border-white/10 space-y-2.5">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{locale === "hi" ? "त्वरित पर्सोना स्विच (8 प्रोफाइल)" : "Quick Persona Switcher (8 Profiles)"}</span>
        </div>
        <span className="text-[10px] text-mist-400">
          {locale === "hi" ? "समान मौसम, भिन्न प्राथमिकताएं" : "Same Weather • Different Prioritization"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {ALL_8_DEMO_PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isCurrentActive =
            active === persona.id ||
            currentInterest === persona.key;

          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSwitch(persona)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                isCurrentActive
                  ? "border-sky-400/80 bg-sky-500/20 text-sky-200 shadow-md shadow-sky-500/20 scale-[1.02]"
                  : "border-white/10 bg-white/[0.03] text-mist-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-mist-100"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 transition-transform ${
                  isCurrentActive ? "scale-110 text-sky-400" : "text-mist-400"
                }`}
              />
              <span>{locale === "hi" ? persona.labelHi : persona.labelEn}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
