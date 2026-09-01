"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { InterestKey, LocationInfo } from "@/lib/types";

export interface PreferencesData {
  name: string;
  interests: InterestKey[];
  preferred_location: LocationInfo | null;
  notification_prefs: { alerts: boolean; daily_summary: boolean };
  units: "metric" | "imperial";
}

export const DEFAULT_PREFERENCES: PreferencesData = {
  name: "",
  interests: [],
  preferred_location: null,
  notification_prefs: { alerts: true, daily_summary: false },
  units: "metric",
};

interface PreferencesContextValue {
  preferences: PreferencesData;
  loading: boolean;
  hasOnboarded: boolean;
  updatePreferences: (patch: Partial<PreferencesData>) => Promise<void>;
  refresh: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextValue>({
  preferences: DEFAULT_PREFERENCES,
  loading: true,
  hasOnboarded: false,
  updatePreferences: async () => {},
  refresh: async () => {},
});

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesData>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("preferences")
      .select("name, interests, preferred_location, notification_prefs, units")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setPreferences({ ...DEFAULT_PREFERENCES, ...data });
    } else {
      const seeded = { ...DEFAULT_PREFERENCES, name: user.email?.split("@")[0] ?? "" };
      await supabase.from("preferences").upsert({ user_id: user.id, ...seeded });
      setPreferences(seeded);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePreferences = async (patch: Partial<PreferencesData>) => {
    if (!user) return;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    const supabase = createClient();
    await supabase.from("preferences").upsert({ user_id: user.id, ...next });
  };

  const hasOnboarded = preferences.interests.length > 0;

  return (
    <PreferencesContext.Provider value={{ preferences, loading, hasOnboarded, updatePreferences, refresh }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}
