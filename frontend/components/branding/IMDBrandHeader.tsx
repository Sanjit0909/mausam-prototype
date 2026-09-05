"use client";

import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

interface IMDBrandHeaderProps {
  className?: string;
}

/**
 * Compact official IMD institutional strip for the SIH prototype.
 * Uses the project-owner-provided logo asset; wordmark text is rendered via i18n
 * so EN/HI can switch without altering the logo artwork.
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
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          {/* Emblem-only crop: asset is a wide banner that also contains English wordmark text. */}
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-slate-200/80 sm:h-9 sm:w-9">
            <Image
              src="/branding/imd-logo.png"
              alt={t("imd.logoAlt")}
              fill
              sizes="36px"
              priority
              className="object-cover object-left scale-[1.85] origin-left"
            />
          </div>

          <div className="min-w-0 leading-tight">
            <p className="truncate text-[11px] font-semibold text-slate-900 sm:text-xs md:text-[13px]">
              {t("imd.name")}
            </p>
            <p className="truncate text-[9px] text-slate-600 sm:text-[10px] md:text-xs">{t("imd.ministry")}</p>
            <p className="truncate text-[9px] text-slate-500 sm:text-[10px] md:text-xs">{t("imd.gov")}</p>
          </div>
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
