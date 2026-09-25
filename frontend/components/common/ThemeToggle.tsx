"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { locale } = useLanguage();

  const isDark = theme === "dark";
  const label = isDark
    ? locale === "hi"
      ? "लाइट थीम"
      : "Light Theme"
    : locale === "hi"
    ? "डार्क थीम"
    : "Dark Theme";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`group relative flex min-h-11 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 active:scale-95 ${
        isDark
          ? "border border-neutral-800 bg-neutral-900/90 text-amber-300 hover:border-amber-400/40 hover:bg-neutral-800"
          : "border border-white/20 bg-white/15 text-white shadow-sm backdrop-blur-md hover:border-white/40 hover:bg-white/25"
      } ${className}`}
      aria-label={label}
      title={label}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
        ) : (
          <Moon className="h-4 w-4 text-sky-100 transition-transform duration-300 group-hover:-rotate-12" />
        )}
      </div>

      {showLabel && <span className="font-semibold">{label}</span>}
    </button>
  );
}
