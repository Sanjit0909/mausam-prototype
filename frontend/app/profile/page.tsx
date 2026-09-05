"use client";

import { useEffect, useState } from "react";
import { Bell, Check, LogOut, MapPin, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { InterestSelector } from "@/components/personalization/InterestSelector";
import { LocationSearch } from "@/components/location/LocationSearch";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import { locationLabel } from "@/lib/utils/format";
import type { InterestKey } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { location, setLocation } = useLocation();
  const { t } = useLanguage();
  const [name, setName] = useState(preferences.name);
  const [interests, setInterests] = useState<InterestKey[]>(preferences.interests);
  const [alertsOn, setAlertsOn] = useState(preferences.notification_prefs.alerts);
  const [dailySummary, setDailySummary] = useState(preferences.notification_prefs.daily_summary);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(preferences.name);
    setInterests(preferences.interests);
    setAlertsOn(preferences.notification_prefs.alerts);
    setDailySummary(preferences.notification_prefs.daily_summary);
  }, [preferences]);

  const toggleInterest = (key: InterestKey) => {
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    await updatePreferences({
      name,
      interests,
      preferred_location: location,
      notification_prefs: { alerts: alertsOn, daily_summary: dailySummary },
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
