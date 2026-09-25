"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, CloudSun, Compass, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useEffect, useState } from "react";
import type { TranslationKey } from "@/lib/i18n/translations";

const HIDE_BOTTOM_NAV_PATHS = new Set(["/", "/login", "/signup"]);

interface BottomNavItem {
  href: string;
  labelKey?: TranslationKey;
  labelFallback: string;
  icon: typeof CloudSun;
  isDemo?: boolean;
}

const ITEMS: BottomNavItem[] = [
  { href: "/home", labelKey: "nav.home", labelFallback: "Home", icon: CloudSun },
  { href: "/explore", labelKey: "nav.explore", labelFallback: "Explore", icon: Compass },
  { href: "/alerts", labelKey: "nav.alerts", labelFallback: "Alerts", icon: Bell },
  { href: "/assistant", labelKey: "nav.assistant", labelFallback: "Copilot", icon: Bot },
  { href: "/demo", labelFallback: "Demo", icon: SlidersHorizontal, isDemo: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { t, locale } = useLanguage();
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);

  // Check if current route is auth landing/login where bottom nav is suppressed
  const isHidden = HIDE_BOTTOM_NAV_PATHS.has(pathname);

  // Read cached alerts count from sessionStorage or home state if available
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("mausam:alert_count");
      if (cached) {
        setActiveAlertCount(parseInt(cached, 10) || 0);
      }
    } catch {
      /* ignore */
    }
  }, [pathname]);

  if (isHidden) return null;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[rgba(25,75,105,0.52)] backdrop-blur-2xl border-t border-white/20 shadow-[0_-8px_30px_rgba(0,24,40,0.20)] dark:bg-black/95 dark:border-neutral-800 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.85)] pb-safe transition-colors duration-300"
    >
      <div className="grid grid-cols-5 h-15 max-w-lg mx-auto items-center px-1">
        {ITEMS.map((item) => {
          const isActive =
            item.href === "/home"
              ? pathname === "/home" || pathname === "/weather"
              : pathname.startsWith(item.href);

          const Icon = item.icon;
          const label = item.isDemo
            ? locale === "hi"
              ? "डेमो"
              : "Demo"
            : item.labelKey
            ? t(item.labelKey)
            : item.labelFallback;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 min-h-[48px] rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-white font-semibold dark:text-sky-400"
                  : "text-white/78 hover:text-white dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {/* Active top glow indicator */}
              {isActive && (
                <span className="absolute -top-1.5 w-7 h-1 rounded-full bg-gradient-to-r from-sky-300 to-white shadow-[0_0_10px_rgba(255,255,255,0.8)] dark:from-sky-400 dark:to-sky-300 dark:shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? "scale-110 stroke-[2.25]" : "stroke-[1.75]"
                  }`}
                />

                {/* Alerts count badge */}
                {item.href === "/alerts" && activeAlertCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-navy-950">
                    {activeAlertCount > 9 ? "9+" : activeAlertCount}
                  </span>
                )}

                {/* Demo special indicator */}
                {item.isDemo && (
                  <span className="absolute -top-1 -right-2.5 flex h-2 w-2 rounded-full bg-amber-400 ring-2 ring-navy-950" />
                )}
              </div>

              <span className="text-[10.5px] mt-1 tracking-tight leading-none truncate max-w-[62px]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
