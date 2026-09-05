"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

interface IMDBrandHeaderProps {
  className?: string;
}

/** Intrinsic size of frontend/public/branding/imd-logo.png (official horizontal IMD banner). */
const IMD_LOGO_WIDTH = 445;
const IMD_LOGO_HEIGHT = 84;

/**
 * Compact official IMD institutional strip for the SIH prototype.
 * Renders the owner-provided horizontal IMD branding image directly
 * (emblem + department / ministry / government wordmark).
 */
export function IMDBrandHeader({ className = "" }: IMDBrandHeaderProps) {
  const { t } = useLanguage();

  return (
    <div
      className={`border-b border-slate-200 bg-white text-slate-900 ${className}`}
      role="banner"
      aria-label={t("imd.name")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2 md:px-8">
        <div className="min-w-0 flex-1">
          <Image
            src="/branding/imd-logo.png"
            alt={t("imd.logoAlt")}
            width={IMD_LOGO_WIDTH}
            height={IMD_LOGO_HEIGHT}
            priority
            quality={100}
            className="h-7 w-auto max-w-full object-contain object-left sm:h-8 md:h-10"
          />
        </div>

        <div className="max-w-[7.5rem] shrink-0 text-right sm:max-w-none">
          <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">
            {t("imd.prototype")}
          </p>
          <p className="text-[8px] text-slate-400 sm:text-[10px]">{t("imd.demo")}</p>
        </div>
      </div>
    </div>
  );
}
