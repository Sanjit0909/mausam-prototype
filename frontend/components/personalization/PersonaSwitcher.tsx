"use client";

import { useState } from "react";
import { Bike, Briefcase, Sparkles, Sprout } from "lucide-react";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { InterestKey, PersonaId, PersonaProfile } from "@/lib/types";

interface DemoPersona {
  id: string;
  key: InterestKey;
  persona: PersonaId;
  labelKey: TranslationKey;
  icon: typeof Bike;
  persona_profile: PersonaProfile;
}

/** Same-location demo personas — location stays put so SIH can prove UI differences from profile alone. */
const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "runner",
    key: "outdoor_fitness",
    persona: "runner",
    labelKey: "persona.runnerSame",
    icon: Bike,
    persona_profile: { primary_persona: "runner" },
  },
  {
    id: "farmer-wheat",
    key: "agriculture",
    persona: "farmer",
    labelKey: "persona.farmerWheat",
    icon: Sprout,
    persona_profile: {
      primary_persona: "farmer",
      farmer: { crop: "wheat", crop_stage: "flowering", irrigation_type: "canal", field_size_ha: 2 },
    },
  },
  {
    id: "farmer-rice",
    key: "agriculture",
    persona: "farmer",
    labelKey: "persona.farmerRice",
    icon: Sprout,
    persona_profile: {
      primary_persona: "farmer",
      farmer: { crop: "rice", crop_stage: "vegetative", irrigation_type: "canal", field_size_ha: 1.5 },
    },
  },
  {
    id: "traveller",
    key: "travel",
    persona: "traveller",
    labelKey: "persona.travelerSame",
    icon: Briefcase,
    persona_profile: { primary_persona: "traveller" },
  },
];

/** Switches interests + farm profile only — keeps the current map location for fair comparison. */
export function PersonaSwitcher() {
  const { updatePreferences, preferences } = usePreferences();
  const { t } = useLanguage();
  const [active, setActive] = useState<string | null>(null);

  const handleSwitch = async (persona: DemoPersona) => {
    setActive(persona.id);
    void updatePreferences({
      interests: [persona.key],
      preferred_location: preferences.preferred_location,
      persona_profile: persona.persona_profile,
    });
  };

  return (
    <div className="glass rounded-2xl p-3">
      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-mist-500">
        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
        {t("persona.switch")}
      </div>
      <p className="mb-2 px-1 text-[11px] text-mist-500">{t("persona.switchHint")}</p>
      <div className="flex flex-wrap gap-2">
        {DEMO_PERSONAS.map((persona) => {
          const Icon = persona.icon;
          const isActive = active === persona.id;
          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => handleSwitch(persona)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${
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
