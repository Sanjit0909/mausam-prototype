"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CloudSun, Loader2, Lock, Mail } from "lucide-react";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("oauth") === "1") {
      setError(t("auth.googleError"));
    }
  }, [searchParams, t]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(searchParams.get("next") || "/home");
    }
  }, [authLoading, user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(searchParams.get("next") || "/home");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-end">
          <LanguageToggle />
        </div>
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600">
            <CloudSun className="h-5 w-5 text-navy-950" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-mist-100">MAUSAM</span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <h1 className="text-xl font-semibold text-mist-100">{t("auth.login.title")}</h1>
          <p className="mt-1 text-sm text-mist-400">{t("auth.login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-mist-100 placeholder:text-mist-400 outline-none focus:border-sky-400/50"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth.password")}
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
              {t("auth.login.submit")}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-mist-500">
            <span className="h-px flex-1 bg-white/10" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <GoogleAuthButton label={t("auth.login.google")} />

          <p className="mt-6 text-center text-sm text-mist-400">
            {t("auth.login.noAccount")}{" "}
            <Link href="/signup" className="font-medium text-sky-400 hover:text-sky-300">
              {t("auth.login.signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
