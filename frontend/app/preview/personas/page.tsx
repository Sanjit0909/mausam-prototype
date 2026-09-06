"use client";

/**
 * Auth-free SIH preview: same location, switchable personas, live /api/home data.
 * Not a protected route — used to verify Farmer/Runner/Traveller UI without login.
 */
import { useMemo, useState } from "react";
import { Bike, Briefcase, Sprout } from "lucide-react";
import { PersonaHomeDashboard } from "@/components/personalization/PersonaHomeDashboard";
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useHomeData } from "@/hooks/useHomeData";
import { useLanguage } from "@/context/LanguageContext";
import type { InterestKey, PersonaId, PersonaProfile } from "@/lib/types";

const PREVIEW_LOCATION = {
  name: "Greater Noida",
  admin1: "Uttar Pradesh",
  country: "India",
  lat: 28.474,
  lon: 77.504,
};

type PreviewKey = "runner" | "farmer_wheat" | "farmer_rice" | "traveller";

const PREVIEWS: Record<
  PreviewKey,
  { label: string; labelHi: string; interest: InterestKey; persona: PersonaId; profile: PersonaProfile; icon: typeof Bike }
> = {
  runner: {
    label: "Runner",
    labelHi: "धावक",
    interest: "outdoor_fitness",
    persona: "runner",
    profile: { primary_persona: "runner" },
    icon: Bike,
  },
  farmer_wheat: {
    label: "Farmer · Wheat",
    labelHi: "किसान · गेहूँ",
    interest: "agriculture",
    persona: "farmer",
    profile: {
      primary_persona: "farmer",
      farmer: { crop: "wheat", crop_stage: "flowering", irrigation_type: "canal", field_size_ha: 2 },
    },
    icon: Sprout,
  },
  farmer_rice: {
    label: "Farmer · Rice",
    labelHi: "किसान · चावल",
    interest: "agriculture",
    persona: "farmer",
    profile: {
      primary_persona: "farmer",
      farmer: { crop: "rice", crop_stage: "vegetative", irrigation_type: "canal", field_size_ha: 1.5 },
    },
    icon: Sprout,
  },
  traveller: {
    label: "Traveller",
    labelHi: "यात्री",
    interest: "travel",
    persona: "traveller",
    profile: { primary_persona: "traveller" },
    icon: Briefcase,
  },
};

export default function PersonaPreviewPage() {
  const { t, locale } = useLanguage();
  const [active, setActive] = useState<PreviewKey>("farmer_wheat");
  const cfg = PREVIEWS[active];
  const interests = useMemo(() => [cfg.interest], [cfg.interest]);

  const { weather, forecast, airQuality, alerts, insights, astronomy, marine, persona, loading, error, refresh } =
    useHomeData(PREVIEW_LOCATION.lat, PREVIEW_LOCATION.lon, PREVIEW_LOCATION.name, interests, cfg.profile);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-sky-400/90">
            {locale === "hi" ? "SIH प्रीव्यू · बिना लॉगिन" : "SIH preview · no login"}
          </p>
          <h1 className="text-xl font-semibold text-mist-100">
            {locale === "hi" ? "पर्सोना होमपेज तुलना" : "Persona homepage comparison"}
          </h1>
          <p className="mt-1 text-sm text-mist-400">
            {locale === "hi"
              ? `${PREVIEW_LOCATION.name} — एक ही स्थान/मौसम, अलग प्रोफ़ाइल`
              : `${PREVIEW_LOCATION.name} — same location & weather, different profiles`}
          </p>
        </div>
        <LanguageToggle />
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(PREVIEWS) as PreviewKey[]).map((key) => {
          const item = PREVIEWS[key];
          const Icon = item.icon;
          const selected = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
                selected
                  ? "border-sky-400/60 bg-sky-500/15 text-sky-300"
                  : "border-white/10 bg-white/[0.03] text-mist-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {locale === "hi" ? item.labelHi : item.label}
            </button>
          );
        })}
      </div>

      {loading && !weather && (
        <div className="space-y-6">
          <HeroSkeleton />
          <GridSkeleton />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {error && !weather && <ErrorState message={error || t("home.loadError")} onRetry={refresh} />}

      {weather && (
        <PersonaHomeDashboard
          personaId={cfg.persona}
          weather={weather}
          forecast={forecast}
          airQuality={airQuality}
          alerts={alerts}
          insights={insights}
          astronomy={astronomy}
          marine={marine}
          persona={persona}
        />
      )}
    </div>
  );
}
