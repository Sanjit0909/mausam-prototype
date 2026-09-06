"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PersonaHomeDashboard } from "@/components/personalization/PersonaHomeDashboard";
import { PersonaSwitcher } from "@/components/personalization/PersonaSwitcher";
import { HomeAskMausamAI } from "@/components/ai/HomeAskMausamAI";
import { LocationSearch } from "@/components/location/LocationSearch";
import { HeroSkeleton, GridSkeleton, Skeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useHomeData } from "@/hooks/useHomeData";
import { useLanguage } from "@/context/LanguageContext";
import { getPersonaConfig, resolvePersonaId } from "@/lib/personalization/personaConfig";
import { locationLabel } from "@/lib/utils/format";
import type { TranslationKey } from "@/lib/i18n/translations";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { location } = useLocation();
  const { preferences, loading: prefsLoading, hasOnboarded } = usePreferences();
  const { t } = useLanguage();
  const personaId = resolvePersonaId(
    preferences.interests,
    preferences.persona_profile?.primary_persona
  );
  const personaConfig = getPersonaConfig(personaId);

  const { weather, forecast, airQuality, alerts, insights, astronomy, marine, persona, loading, refreshing, error, refresh } =
    useHomeData(
      location.lat,
      location.lon,
      locationLabel(location),
      preferences.interests,
      preferences.persona_profile
    );

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!prefsLoading && user && !hasOnboarded) router.replace("/onboarding");
  }, [prefsLoading, hasOnboarded, user, router]);

  if (authLoading || (prefsLoading && !preferences.interests.length)) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:px-8">
        <HeroSkeleton />
        <GridSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-mist-100">
            {preferences.name
              ? t("home.greetingNamed", { name: preferences.name.split(" ")[0] })
              : t("home.greeting")}
          </h1>
          <p className="text-sm text-mist-400">
            {t("persona.home.subtitle", { persona: t(personaConfig.heroTitleKey as TranslationKey) })}
          </p>
        </div>
        <div className="w-full sm:w-80">
          <LocationSearch placeholder={t("home.changeLocation")} />
        </div>
      </div>

      <PersonaSwitcher />

      <HomeAskMausamAI />

      {refreshing && weather && <p className="text-xs text-mist-500">{t("home.updating")}</p>}

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
          personaId={personaId}
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
