"use client";

import { useLanguage } from "@/context/LanguageContext";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={`flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 ${className}`}
      role="group"
      aria-label={t("nav.language")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`min-h-11 min-w-11 rounded-full px-2 text-xs font-semibold ${
          locale === "en" ? "bg-white/15 text-mist-100" : "text-mist-400"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("hi")}
        className={`min-h-11 min-w-[3rem] rounded-full px-2 text-xs font-semibold ${
          locale === "hi" ? "bg-white/15 text-mist-100" : "text-mist-400"
        }`}
      >
        हिंदी
      </button>
    </div>
  );
}
