"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CloudSun, Loader2 } from "lucide-react";
import { InterestSelector } from "@/components/personalization/InterestSelector";
import { usePreferences } from "@/context/PreferencesContext";
import type { InterestKey } from "@/lib/types";

export default function OnboardingPage() {
  const router = useRouter();
  const { preferences, updatePreferences } = usePreferences();
  const [selected, setSelected] = useState<InterestKey[]>(preferences.interests);
  const [saving, setSaving] = useState(false);

  const toggle = (key: InterestKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleContinue = async () => {
    setSaving(true);
    await updatePreferences({ interests: selected });
    router.push("/home");
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-16">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 mb-6">
        <CloudSun className="h-6 w-6 text-navy-950" />
      </div>
      <h1 className="text-center text-2xl font-semibold text-mist-100 md:text-3xl">What matters most to you?</h1>
      <p className="mt-2 text-center text-sm text-mist-400 max-w-md">
        Pick one or more - MAUSAM will prioritize your homepage cards, insights, and recommendations around these.
        You can change this anytime in your profile.
      </p>

      <div className="mt-8 w-full">
        <InterestSelector selected={selected} onToggle={toggle} />
      </div>

      <button
        onClick={handleContinue}
        disabled={selected.length === 0 || saving}
        className="mt-8 flex items-center gap-2 rounded-full bg-sky-500 px-8 py-3 text-sm font-semibold text-navy-950 hover:bg-sky-400 transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Build My Homepage
      </button>
      {selected.length === 0 && <p className="mt-2 text-xs text-mist-500">Select at least one interest to continue.</p>}
    </div>
  );
}
