"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CloudSun, LogOut, MapPin, Menu, MessageCircle, Search, Settings, User, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "@/context/LocationContext";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { IMDBrandHeader } from "@/components/branding/IMDBrandHeader";
import type { TranslationKey } from "@/lib/i18n/translations";

const NAV_LINKS: { href: string; labelKey: TranslationKey }[] = [
  { href: "/home", labelKey: "nav.home" },
  { href: "/weather", labelKey: "nav.weather" },
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
        <div className="border-b border-white/5 bg-navy-950/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 md:px-8 md:py-3">
            <div className="flex items-center gap-6">
              <Link href="/home" className="flex items-center gap-2 shrink-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/20">
                  <CloudSun className="h-5 w-5 text-navy-950" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-mist-100">MAUSAM</span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      pathname.startsWith(link.href)
                        ? "bg-white/10 text-mist-100"
                        : "text-mist-400 hover:text-mist-100 hover:bg-white/5"
                    }`}
                  >
                    {t(link.labelKey)}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/explore"
                className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-mist-300 hover:bg-white/10 hover:text-mist-100 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-sky-400" />
                <span className="max-w-[140px] truncate">{location.name}</span>
                <Search className="h-3.5 w-3.5 opacity-60" />
              </Link>

              <LanguageToggle />

              <Link
                href="/alerts"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-mist-300 transition-colors hover:bg-white/10 hover:text-mist-100"
                aria-label={t("nav.alerts")}
              >
                <Bell className="h-5 w-5" />
              </Link>

              <div className="relative hidden sm:block">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-mist-100 transition-colors hover:bg-white/20"
                  aria-label={t("nav.profileMenu")}
                >
                  <User className="h-4 w-4" />
                </button>
                {profileOpen && (
                  <div
                    className="glass absolute right-0 mt-2 w-52 rounded-2xl p-2 text-sm"
                    onMouseLeave={() => setProfileOpen(false)}
                  >
                    <p className="truncate px-3 py-2 text-xs text-mist-400">{user?.email}</p>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Settings className="h-4 w-4" /> {t("nav.profileFull")}
                    </Link>
                    <Link
                      href="/assistant"
                      className="flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-mist-200 hover:bg-white/10"
                      onClick={() => setProfileOpen(false)}
                    >
                      <MessageCircle className="h-4 w-4" /> {t("nav.assistant")}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex min-h-11 w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-mist-300 hover:bg-white/10 md:hidden"
                aria-label={t("nav.menu")}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="md:hidden border-t border-white/5 px-4 py-3 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-sm font-medium ${
                    pathname.startsWith(link.href) ? "bg-white/10 text-mist-100" : "text-mist-300"
                  }`}
                >
                  {t(link.labelKey)}
                </Link>
              ))}
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="min-h-11 rounded-xl px-3 py-2 text-sm text-mist-300">
                {t("nav.profileFull")}
              </Link>
              <button onClick={handleSignOut} className="min-h-11 rounded-xl px-3 py-2 text-left text-sm text-rose-400">
                {t("nav.signOut")}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
