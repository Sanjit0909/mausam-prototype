"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CloudSun, Loader2 } from "lucide-react";
import { InterestSelector } from "@/components/personalization/InterestSelector";
import { FarmerProfileFields } from "@/components/personalization/FarmerProfileFields";
import { usePreferences } from "@/context/PreferencesContext";
import { useLanguage } from "@/context/LanguageContext";
import type { FarmerProfile, InterestKey, PersonaProfile } from "@/lib/types";

const DEFAULT_FARMER: FarmerProfile = {
  crop: "wheat",
  crop_stage: "vegetative",
  irrigation_type: null,
  sowing_date: null,
  field_size_ha: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const { preferences, updatePreferences } = usePreferences();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<InterestKey[]>(preferences.interests);
  const [farmer, setFarmer] = useState<FarmerProfile>(
    preferences.persona_profile?.farmer ?? DEFAULT_FARMER
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key: InterestKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleContinue = async () => {
    setSaving(true);
    const persona_profile: PersonaProfile = {
      ...(preferences.persona_profile ?? {}),
      farmer: selected.includes("agriculture") ? farmer : preferences.persona_profile?.farmer ?? null,
      primary_persona: selected.includes("agriculture")
        ? "farmer"
        : selected.includes("outdoor_fitness")
          ? "runner"
          : selected.includes("travel")
            ? "traveller"
            : null,
    };
    await updatePreferences({ interests: selected, persona_profile });
    router.push("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600">
        <CloudSun className="h-6 w-6 text-navy-950" />
      </div>
      <h1 className="text-center text-2xl font-semibold text-mist-100 md:text-3xl">{t("onboarding.title")}</h1>
      <p className="mt-2 max-w-md text-center text-sm text-mist-400">{t("onboarding.subtitle")}</p>

      <div className="mt-8 w-full">
        <InterestSelector selected={selected} onToggle={toggle} />
      </div>

      {selected.includes("agriculture") && (
        <div className="mt-6 w-full glass rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-mist-200">{t("crop.profileTitle")}</h2>
          <p className="text-xs text-mist-500">{t("crop.profileHint")}</p>
          <FarmerProfileFields value={farmer} onChange={setFarmer} />
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={selected.length === 0 || saving}
        className="mt-8 flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400 disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {t("onboarding.cta")}
      </button>
      {selected.length === 0 && <p className="mt-2 text-xs text-mist-500">{t("onboarding.hint")}</p>}
    </div>
  );
}
