"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { InterestKey, LocationInfo, PersonaProfile } from "@/lib/types";

/** Legacy unscoped keys — cleared on logout so they cannot leak across accounts. */
const LEGACY_PERSONA_PROFILE_KEY = "mausam:personaProfile";
const LEGACY_INTERESTS_KEY = "mausam:interests";

function personaProfileKey(userId: string) {
  return `mausam:personaProfile:${userId}`;
}
function interestsKey(userId: string) {
  return `mausam:interests:${userId}`;
}

export interface PreferencesData {
  name: string;
  interests: InterestKey[];
  preferred_location: LocationInfo | null;
  notification_prefs: { alerts: boolean; daily_summary: boolean };
  units: "metric" | "imperial";
  persona_profile: PersonaProfile | null;
}

export const DEFAULT_PREFERENCES: PreferencesData = {
  name: "",
  interests: [],
  preferred_location: null,
  notification_prefs: { alerts: true, daily_summary: false },
  units: "metric",
  persona_profile: null,
};

function clearLegacyPreferenceCaches() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_PERSONA_PROFILE_KEY);
  localStorage.removeItem(LEGACY_INTERESTS_KEY);
}

function readLocalPersonaProfile(userId: string): PersonaProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(personaProfileKey(userId)) ??
      localStorage.getItem(LEGACY_PERSONA_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersonaProfile;
  } catch {
    return null;
  }
}

function writeLocalPersonaProfile(userId: string, profile: PersonaProfile | null) {
  if (typeof window === "undefined") return;
  const key = personaProfileKey(userId);
  if (!profile) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(profile));
  // Drop legacy unscoped copy once a scoped write succeeds.
  localStorage.removeItem(LEGACY_PERSONA_PROFILE_KEY);
}

function readLocalInterests(userId: string): InterestKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(interestsKey(userId)) ?? localStorage.getItem(LEGACY_INTERESTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InterestKey[]) : [];
  } catch {
    return [];
  }
}

function writeLocalInterests(userId: string, interests: InterestKey[]) {
  if (typeof window === "undefined") return;
  const key = interestsKey(userId);
  if (!interests.length) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(interests));
  localStorage.removeItem(LEGACY_INTERESTS_KEY);
}

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
      clearLegacyPreferenceCaches();
      setLoading(false);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const localProfile = readLocalPersonaProfile(user.id);
    const localInterests = readLocalInterests(user.id);

    // Prefer extended select; fall back if persona_profile column is not migrated yet.
    let data: Record<string, unknown> | null = null;
    const extended = await supabase
      .from("preferences")
      .select("name, interests, preferred_location, notification_prefs, units, persona_profile")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!extended.error) {
      data = extended.data as Record<string, unknown> | null;
    } else {
      const basic = await supabase
        .from("preferences")
        .select("name, interests, preferred_location, notification_prefs, units")
        .eq("user_id", user.id)
        .maybeSingle();
      data = (basic.data as Record<string, unknown> | null) ?? null;
    }

    if (data) {
      const remoteProfile = (data.persona_profile as PersonaProfile | null | undefined) ?? null;
      // Remote wins when present; local is only a reload-race / migration fallback for *this* user.
      const persona_profile = remoteProfile ?? localProfile;
      if (persona_profile) writeLocalPersonaProfile(user.id, persona_profile);
      const remoteInterests = (data.interests as InterestKey[]) ?? [];
      const interests = remoteInterests.length > 0 ? remoteInterests : localInterests;
      if (interests.length) writeLocalInterests(user.id, interests);
      setPreferences({
        ...DEFAULT_PREFERENCES,
        name: (data.name as string) ?? "",
        interests,
        preferred_location: (data.preferred_location as LocationInfo | null) ?? null,
        notification_prefs: (data.notification_prefs as PreferencesData["notification_prefs"]) ??
          DEFAULT_PREFERENCES.notification_prefs,
        units: (data.units as PreferencesData["units"]) ?? "metric",
        persona_profile,
      });
    } else {
      const seeded: PreferencesData = {
        ...DEFAULT_PREFERENCES,
        name: user.email?.split("@")[0] ?? "",
        interests: localInterests,
        persona_profile: localProfile,
      };
      await supabase.from("preferences").upsert({
        user_id: user.id,
        name: seeded.name,
        interests: seeded.interests,
        preferred_location: seeded.preferred_location,
        notification_prefs: seeded.notification_prefs,
        units: seeded.units,
      });
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
    if ("persona_profile" in patch) {
      writeLocalPersonaProfile(user.id, next.persona_profile);
    }
    if ("interests" in patch) {
      writeLocalInterests(user.id, next.interests);
    }
    setPreferences(next);
    const supabase = createClient();
    const row: Record<string, unknown> = {
      user_id: user.id,
      name: next.name,
      interests: next.interests,
      preferred_location: next.preferred_location,
      notification_prefs: next.notification_prefs,
      units: next.units,
    };
    if (next.persona_profile !== undefined) {
      row.persona_profile = next.persona_profile;
    }
    const { error } = await supabase.from("preferences").upsert(row);
    // If persona_profile column missing, retry without it (localStorage already saved).
    if (error && next.persona_profile !== undefined) {
      delete row.persona_profile;
      await supabase.from("preferences").upsert(row);
    }
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
