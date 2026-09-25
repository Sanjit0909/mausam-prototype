"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { OAuthLandingRedirect } from "@/components/auth/OAuthLandingRedirect";
import { useLanguage } from "@/context/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import {
  ArrowRight,
  Bike,
  Bot,
  Briefcase,
  Cloud,
  CloudSun,
  HeartPulse,
  Shield,
  Sparkles,
  Sprout,
  Waves,
} from "lucide-react";

const PERSONAS: { icon: typeof Bike; labelKey: TranslationKey; detailKey: TranslationKey }[] = [
  { icon: Bike, labelKey: "landing.persona.fitness", detailKey: "landing.persona.fitness.detail" },
  { icon: Briefcase, labelKey: "landing.persona.travel", detailKey: "landing.persona.travel.detail" },
  { icon: HeartPulse, labelKey: "landing.persona.health", detailKey: "landing.persona.health.detail" },
  { icon: Sprout, labelKey: "landing.persona.agri", detailKey: "landing.persona.agri.detail" },
  { icon: Waves, labelKey: "landing.persona.marine", detailKey: "landing.persona.marine.detail" },
];

const FEATURES: { icon: typeof Sparkles; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: Sparkles, titleKey: "landing.feature.personal.title", descKey: "landing.feature.personal.desc" },
  { icon: Cloud, titleKey: "landing.feature.live.title", descKey: "landing.feature.live.desc" },
  { icon: Bot, titleKey: "landing.feature.ai.title", descKey: "landing.feature.ai.desc" },
  { icon: Shield, titleKey: "landing.feature.alerts.title", descKey: "landing.feature.alerts.desc" },
];

export default function LandingPage() {
  const { t, locale } = useLanguage();

  return (
    <div className="min-h-screen">
      <Suspense fallback={null}>
        <OAuthLandingRedirect />
      </Suspense>
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/20">
            <CloudSun className="h-5 w-5 text-navy-950" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MAUSAM</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link
            href="/login"
            className="flex min-h-11 items-center text-sm font-medium text-mist-300 transition-colors hover:text-mist-100"
          >
            {t("nav.logIn")}
          </Link>
          <Link
            href="/signup"
            className="flex min-h-11 items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400"
          >
            {t("nav.getStarted")}
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> {t("landing.badge")}
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white md:text-6xl drop-shadow-sm">
          {t("landing.heroBefore")} <span className="text-gradient-sky">{t("landing.heroHighlight")}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-white/90 md:text-lg font-normal leading-relaxed">{t("landing.subtitle")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/demo"
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-6 py-3 text-sm font-bold text-navy-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>{locale === "hi" ? "मौसम डेमो एक्सप्लोर करें" : "Explore MAUSAM (Guest Demo)"}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-navy-950 hover:bg-sky-400 transition-colors shadow-md"
          >
            {t("landing.ctaPrimary")}
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium text-white hover:bg-white/20 transition-colors backdrop-blur-md"
          >
            {t("landing.ctaSecondary")}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="glass rounded-3xl p-6 md:p-8">
          <p className="mb-5 text-center text-xs font-bold uppercase tracking-wider text-sky-200 dark:text-sky-400">
            {t("landing.personasTitle")}
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {PERSONAS.map((p) => (
              <div key={p.labelKey} className="glass-hover flex flex-col items-center gap-2 rounded-2xl p-4 text-center">
                <div className="rounded-xl bg-sky-500/20 p-2.5">
                  <p.icon className="h-5 w-5 text-sky-200 dark:text-sky-300" />
                </div>
                <p className="text-sm font-bold text-white">{t(p.labelKey)}</p>
                <p className="text-xs text-white/80 dark:text-neutral-400 font-medium leading-relaxed">{t(p.detailKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.titleKey} className="glass glass-hover rounded-3xl p-6">
              <div className="mb-4 inline-flex rounded-xl bg-white/10 dark:bg-white/5 p-3">
                <f.icon className="h-5 w-5 text-sky-200 dark:text-sky-300" />
              </div>
              <h3 className="text-base font-bold text-white">{t(f.titleKey)}</h3>
              <p className="mt-2 text-sm text-white/85 dark:text-neutral-300 leading-relaxed font-normal">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/70 dark:text-neutral-500">
        {t("landing.footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
