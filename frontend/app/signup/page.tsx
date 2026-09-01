"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudSun, Loader2, Lock, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("preferences").upsert({
        user_id: data.user.id,
        name,
        interests: [],
        units: "metric",
        notification_prefs: { alerts: true, daily_summary: false },
      });
    }

    if (!data.session) {
      // Email confirmation is required before a session exists.
      setConfirmationSent(true);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  };

  if (confirmationSent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
          <h1 className="text-xl font-semibold text-mist-100">Check your inbox</h1>
          <p className="mt-2 text-sm text-mist-400">
            We sent a confirmation link to <span className="text-mist-200">{email}</span>. Confirm your email, then log in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-navy-950 hover:bg-sky-400"
          >
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600">
            <CloudSun className="h-5 w-5 text-navy-950" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-mist-100">MAUSAM</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-xl font-semibold text-mist-100">Create your account</h1>
          <p className="mt-1 text-sm text-mist-400">Start building your personalised weather homepage.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
              />
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 characters)"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
              />
            </div>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sky-500 py-3 text-sm font-semibold text-navy-950 hover:bg-sky-400 transition-colors disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-mist-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-sky-400 hover:text-sky-300">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
