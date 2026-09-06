"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // getSession() reads from local storage instantly instead of revalidating against
    // Supabase's server - fine for client-side UI state since RLS still protects real data.
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const uid = user?.id;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    try {
      // Legacy unscoped caches + this session's scoped preference caches only.
      window.localStorage.removeItem("mausam:personaProfile");
      window.localStorage.removeItem("mausam:interests");
      if (uid) {
        window.localStorage.removeItem(`mausam:personaProfile:${uid}`);
        window.localStorage.removeItem(`mausam:interests:${uid}`);
      }
    } catch {
      /* ignore */
    }
  };

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
