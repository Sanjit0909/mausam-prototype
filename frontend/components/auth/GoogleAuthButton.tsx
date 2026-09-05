"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.5-2.5 1.9C5 19.6 8.3 21.6 12 21.6c2.4 0 4.5-.8 6.2-2.4l-3.1-2.4c-.8.6-1.9 1-3.1 1-2.4 0-4.4-1.6-5.1-3.8z"
      />
      <path
        fill="#4A90E2"
        d="M3.4 7.3C2.5 9 2 10.9 2 12.8c0 1.9.5 3.8 1.4 5.4l3.2-2.4c-.4-1.1-.6-2.2-.6-3 0-.8.2-1.9.6-3L3.4 7.3z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.6c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.4 2.8 14.3 2 12 2 8.3 2 5 4 3.4 7.3l3.2 2.4C7.6 7.2 9.6 5.6 12 5.6z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (oauthError) {
      setError("Google sign-in didn’t work. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold text-mist-100 transition-colors hover:bg-white/10 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {label}
      </button>
      {error && <p className="text-sm text-rose-400">{error}</p>}
    </div>
  );
}
