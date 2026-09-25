"use client";

import { useEffect, useState } from "react";
import { Bell, Check, LogOut, MapPin, Moon, Save, Sprout, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { InterestSelector } from "@/components/personalization/InterestSelector";
import { FarmerProfileFields } from "@/components/personalization/FarmerProfileFields";
import { LocationSearch } from "@/components/location/LocationSearch";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { locationLabel } from "@/lib/utils/format";
import type { FarmerProfile, InterestKey, PersonaProfile } from "@/lib/types";

const DEFAULT_FARMER: FarmerProfile = {
  crop: "wheat",
  crop_stage: "vegetative",
  irrigation_type: null,
  sowing_date: null,
  field_size_ha: null,
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { location, setLocation } = useLocation();
  const { t, locale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(preferences.name);
  const [interests, setInterests] = useState<InterestKey[]>(preferences.interests);
  const [farmer, setFarmer] = useState<FarmerProfile>(
    preferences.persona_profile?.farmer ?? DEFAULT_FARMER
  );
  const [alertsOn, setAlertsOn] = useState(preferences.notification_prefs.alerts);
  const [dailySummary, setDailySummary] = useState(preferences.notification_prefs.daily_summary);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(preferences.name);
    setInterests(preferences.interests);
    setAlertsOn(preferences.notification_prefs.alerts);
    setDailySummary(preferences.notification_prefs.daily_summary);
    setFarmer(preferences.persona_profile?.farmer ?? DEFAULT_FARMER);
  }, [preferences]);

  const toggleInterest = (key: InterestKey) => {
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    const persona_profile: PersonaProfile = {
      ...(preferences.persona_profile ?? {}),
      farmer: interests.includes("agriculture") ? farmer : preferences.persona_profile?.farmer ?? null,
      primary_persona: interests.includes("agriculture")
        ? "farmer"
        : interests.includes("outdoor_fitness")
          ? "runner"
          : interests.includes("travel")
            ? "traveller"
            : preferences.persona_profile?.primary_persona ?? null,
    };
    await updatePreferences({
      name,
      interests,
      preferred_location: location,
      notification_prefs: { alerts: alertsOn, daily_summary: dailySummary },
      persona_profile,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-8">
      <div>
        <h1 className="text-xl font-semibold text-mist-100">{t("profile.title")}</h1>
        <p className="mt-1 text-sm text-mist-400">{user?.email}</p>
      </div>

      <div className="glass space-y-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <User className="h-4 w-4 text-sky-400" /> {t("profile.basic")}
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("profile.namePlaceholder")}
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
        />
      </div>

      <div className="glass space-y-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <MapPin className="h-4 w-4 text-sky-400" /> {t("profile.location")}
        </h2>
        <p className="text-sm text-mist-300">{t("profile.current", { location: locationLabel(location) })}</p>
        <LocationSearch onSelect={setLocation} placeholder={t("profile.locationSearch")} />
      </div>

      <div className="glass space-y-4 rounded-3xl p-6">
        <h2 className="text-sm font-semibold text-mist-200">{t("profile.interests")}</h2>
        <InterestSelector selected={interests} onToggle={toggleInterest} />
      </div>

      {interests.includes("agriculture") && (
        <div className="glass space-y-4 rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
            <Sprout className="h-4 w-4 text-emerald-400" /> {t("crop.profileTitle")}
          </h2>
          <p className="text-xs text-mist-500">{t("crop.profileHint")}</p>
          <FarmerProfileFields value={farmer} onChange={setFarmer} />
        </div>
      )}

      {/* Theme & Visual Mode Selector */}
      <div className="glass space-y-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white/95 dark:text-neutral-200">
          <Sun className="h-4 w-4 text-amber-400" />
          <span>{locale === "hi" ? "थीम और दृश्य रूप" : "Appearance & Theme"}</span>
        </h2>
        <p className="text-xs text-white/70 dark:text-neutral-400">
          {locale === "hi"
            ? "लाइट मोड वायुमंडलीय स्काई ग्रेडिएंट प्रदान करता है, जबकि डार्क मोड शुद्ध ओएलईडी ब्लैक प्रदान करता है।"
            : "Light mode presents an atmospheric cyan/sky gradient. Dark mode delivers pure OLED deep black."}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-all ${
              theme === "light"
                ? "border-white/60 bg-white/25 shadow-lg ring-2 ring-white/50"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <Sun className={`h-6 w-6 ${theme === "light" ? "text-amber-300" : "text-white/60"}`} />
            <div>
              <p className="text-sm font-semibold text-white">
                {locale === "hi" ? "लाइट मोड" : "Light Mode"}
              </p>
              <p className="text-[10px] text-white/75">
                {locale === "hi" ? "डे स्काई ग्रेडिएंट" : "Atmospheric Sky"}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border p-4 text-center transition-all ${
              theme === "dark"
                ? "border-sky-400 bg-neutral-900/90 shadow-lg ring-2 ring-sky-400/40"
                : "border-white/10 bg-black/40 hover:bg-black/60"
            }`}
          >
            <Moon className={`h-6 w-6 ${theme === "dark" ? "text-sky-400" : "text-neutral-400"}`} />
            <div>
              <p className="text-sm font-semibold text-white">
                {locale === "hi" ? "डार्क मोड" : "Dark Mode"}
              </p>
              <p className="text-[10px] text-white/70 dark:text-neutral-400">
                {locale === "hi" ? "शुद्ध ओएलईडी ब्लैक" : "Pure OLED Black"}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="glass space-y-4 rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <Bell className="h-4 w-4 text-sky-400" /> {t("profile.notifications")}
        </h2>
        <label className="flex items-center justify-between text-sm text-mist-300">
          {t("profile.alertsToggle")}
          <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} className="h-4 w-4 accent-sky-500" />
        </label>
        <label className="flex items-center justify-between text-sm text-mist-300">
          {t("profile.dailyToggle")}
          <input
            type="checkbox"
            checked={dailySummary}
            onChange={(e) => setDailySummary(e.target.checked)}
            className="h-4 w-4 accent-sky-500"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? t("profile.saved") : t("profile.save")}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
        >
          <LogOut className="h-4 w-4" /> {t("profile.signOut")}
        </button>
      </div>
    </div>
  );
}
