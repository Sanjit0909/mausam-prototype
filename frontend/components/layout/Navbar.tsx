"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CloudSun, LogOut, MapPin, Menu, MessageCircle, Search, Settings, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { IMDBrandHeader } from "@/components/branding/IMDBrandHeader";
import type { TranslationKey } from "@/lib/i18n/translations";

const NAV_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/home", labelKey: "nav.home" },
  { href: "/weather", labelKey: "weather.title" },
  { href: "/map", labelKey: "nav.map" },
  { href: "/explore", labelKey: "nav.explore" },
  { href: "/alerts", labelKey: "nav.alerts" },
  { href: "/assistant", labelKey: "nav.assistant" },
];

const AUTH_SHELL_PATHS = new Set(["/", "/login", "/signup"]);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { location } = useLocation();
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isAuthShell = AUTH_SHELL_PATHS.has(pathname);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40">
      <IMDBrandHeader />

      {!isAuthShell && (
        <div className="border-b border-white/20 bg-[rgba(25,75,105,0.48)] backdrop-blur-xl dark:border-white/10 dark:bg-black/90 transition-colors duration-300 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-8 md:py-3">
            <div className="flex items-center gap-6">
              <Link href="/home" className="flex items-center gap-2 shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/20">
                  <CloudSun className="h-5 w-5 text-navy-950" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-white">MAUSAM</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`relative min-h-11 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 ${
                        isActive
                          ? "bg-white/20 text-white font-semibold shadow-sm border border-white/30 dark:bg-white/10 dark:border-white/15"
                          : "text-white/78 hover:text-white hover:bg-white/15 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900"
                      }`}
                    >
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-sky-300 dark:bg-sky-400" />}
                      <span>{t(link.labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/explore"
                className="hidden sm:flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm text-white/90 hover:border-white/40 hover:bg-white/20 active:scale-95 transition-all duration-200 dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-300 dark:hover:border-neutral-700"
              >
                <MapPin className="h-3.5 w-3.5 text-sky-300 dark:text-sky-400" />
                <span className="max-w-[140px] truncate font-medium">{location.name}</span>
                <Search className="h-3.5 w-3.5 opacity-60" />
              </Link>

              <Link
                href="/demo"
                className="flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/25 active:scale-95 transition-all dark:bg-amber-400/10 dark:text-amber-300"
                title="SIH 2026 Judge Demo & Persona Comparison Mode"
              >
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Demo Mode</span>
              </Link>

              <ThemeToggle />

              <LanguageToggle />

              <Link
                href="/alerts"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/85 transition-all duration-200 hover:bg-white/15 active:scale-95 dark:text-neutral-300 dark:hover:bg-neutral-800"
                aria-label={t("nav.alerts")}
              >
                <Bell className="h-5 w-5" />
              </Link>

              <div className="relative hidden sm:block">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-mist-100 transition-all duration-200 hover:bg-white/20 active:scale-95"
                  aria-label={t("nav.profileMenu")}
                >
                  <User className="h-4 w-4" />
                </button>
                {profileOpen && (
                  <div
                    className="glass absolute right-0 mt-2 w-52 rounded-2xl p-2 text-sm border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <p className="truncate px-3 py-2 text-xs text-mist-400 border-b border-white/5">{user?.email}</p>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4" /> {t("nav.profileFull")}
                    </Link>
                    <Link
                      href="/assistant"
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10 transition-colors"
                      onClick={() => setProfileOpen(false)}
                    >
                      <MessageCircle className="h-4 w-4" /> {t("nav.assistant")}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-mist-300 hover:bg-white/10 active:scale-95 transition-all md:hidden"
                aria-label={t("nav.menu")}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden border-t border-white/5 px-4 py-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    pathname.startsWith(link.href) ? "bg-white/10 text-mist-100 font-semibold" : "text-mist-300 hover:bg-white/5"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <ThemeToggle showLabel className="w-full justify-center" />
              </div>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-2 text-sm text-mist-300 hover:bg-white/5">
                {t("nav.profileFull")}
              </Link>
              <button onClick={handleSignOut} className="min-h-11 rounded-xl px-3 py-2 text-left text-sm text-rose-400 hover:bg-rose-500/10">
                {t("nav.signOut")}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
