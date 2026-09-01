"use client";

import { useEffect, useState } from "react";
import { Bell, Check, LogOut, MapPin, Save, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { InterestSelector } from "@/components/personalization/InterestSelector";
import { LocationSearch } from "@/components/location/LocationSearch";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useLocation } from "@/context/LocationContext";
import { locationLabel } from "@/lib/utils/format";
import type { InterestKey } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { location, setLocation } = useLocation();
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
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-mist-100">Profile &amp; Preferences</h1>
        <p className="mt-1 text-sm text-mist-400">{user?.email}</p>
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <User className="h-4 w-4 text-sky-400" /> Basic Info
        </h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
        />
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <MapPin className="h-4 w-4 text-sky-400" /> Preferred Location
        </h2>
        <p className="text-sm text-mist-300">Current: {locationLabel(location)}</p>
        <LocationSearch onSelect={setLocation} placeholder="Set a different home location..." />
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-mist-200">Your Interests</h2>
        <InterestSelector selected={interests} onToggle={toggleInterest} />
      </div>

      <div className="glass rounded-3xl p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-200">
          <Bell className="h-4 w-4 text-sky-400" /> Notifications
        </h2>
        <label className="flex items-center justify-between text-sm text-mist-300">
          Severe weather alerts
          <input type="checkbox" checked={alertsOn} onChange={(e) => setAlertsOn(e.target.checked)} className="h-4 w-4 accent-sky-500" />
        </label>
        <label className="flex items-center justify-between text-sm text-mist-300">
          Daily weather summary
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
          className="flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-navy-950 hover:bg-sky-400 transition-colors"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved" : "Save Changes"}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}
