"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/** After Google OAuth returns to the site origin, reuse the existing session listener
 * and send the user into /home (which already routes new users to onboarding). */
export function OAuthLandingRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const oauthError = searchParams.get("error") || searchParams.get("error_description");
    if (oauthError) {
      router.replace("/login?oauth=1");
      return;
    }
    if (!loading && user) {
      router.replace("/home");
    }
  }, [user, loading, router, searchParams]);

  return null;
}
