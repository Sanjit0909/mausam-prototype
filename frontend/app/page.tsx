import { Suspense } from "react";
import Link from "next/link";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { OAuthLandingRedirect } from "@/components/auth/OAuthLandingRedirect";
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

const PERSONAS = [
  { icon: Bike, label: "Outdoor Fitness", detail: "Best time to run, UV & AQI aware" },
  { icon: Briefcase, label: "Travel", detail: "Destination forecasts & packing tips" },
  { icon: HeartPulse, label: "Health", detail: "AQI, UV and comfort tracking" },
  { icon: Sprout, label: "Agriculture", detail: "Rainfall, frost & field conditions" },
  { icon: Waves, label: "Marine / Beach", detail: "Waves, wind & tide outlook" },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "One homepage, personalised to you",
    description: "Select your interests once - MAUSAM reprioritizes every card, insight, and recommendation around what actually matters to you.",
  },
  {
    icon: Cloud,
    title: "Real, live weather data",
    description: "Current conditions, hourly & multi-day forecasts, AQI, UV, and marine data sourced live - never fabricated.",
  },
  {
    icon: Bot,
    title: "AI weather assistant",
    description: "Ask natural questions like \u201cShould I run today?\u201d and get answers grounded in your real local forecast.",
  },
  {
    icon: Shield,
    title: "Alerts that matter",
    description: "Severe weather, heat, air quality, and rain advisories surfaced with clear severity and context.",
  },
];

export default function LandingPage() {
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
          <Link href="/login" className="flex min-h-11 items-center text-sm font-medium text-mist-300 transition-colors hover:text-mist-100">
            Log In
          </Link>
          <Link
            href="/signup"
            className="flex min-h-11 items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-sky-400"
          >
            Get Started
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-20 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-mist-300">
          <Sparkles className="h-3.5 w-3.5 text-sky-400" /> Personalised weather intelligence
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-mist-100 md:text-6xl">
          Weather that adapts to <span className="text-gradient-sky">who you are</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-mist-300 md:text-lg">
          MAUSAM builds one homepage that reprioritizes real-time weather, alerts, and insights around your
          interests - fitness, travel, family, agriculture, and more.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="flex items-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-semibold text-navy-950 hover:bg-sky-400 transition-colors"
          >
            Build My Homepage <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-mist-200 hover:bg-white/5 transition-colors"
          >
            I already have an account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="glass rounded-3xl p-6 md:p-8">
          <p className="mb-5 text-center text-sm font-medium uppercase tracking-wide text-mist-400">
            The same homepage, reshaped for every kind of user
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {PERSONAS.map((p) => (
              <div key={p.label} className="glass-hover flex flex-col items-center gap-2 rounded-2xl p-4 text-center">
                <div className="rounded-xl bg-sky-500/10 p-2.5">
                  <p.icon className="h-5 w-5 text-sky-300" />
                </div>
                <p className="text-sm font-medium text-mist-100">{p.label}</p>
                <p className="text-xs text-mist-400">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass glass-hover rounded-3xl p-6">
              <div className="mb-4 inline-flex rounded-xl bg-white/5 p-3">
                <f.icon className="h-5 w-5 text-sky-300" />
              </div>
              <h3 className="font-semibold text-mist-100">{f.title}</h3>
              <p className="mt-2 text-sm text-mist-400">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-mist-500">
        Built for Smart India Hackathon &middot; Weather data via Open-Meteo &middot; MAUSAM {new Date().getFullYear()}
      </footer>
    </div>
  );
}
