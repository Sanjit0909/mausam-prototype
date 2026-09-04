"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface WhyThisProps {
  reason: string;
  label?: string;
  className?: string;
}

/** Small "Why this?" explainability affordance (spec section 12). Click to reveal the
 * scoring engine's plain-language reason for why this card is prioritized/shown. */
export function WhyThis({ reason, label = "Weather-based recommendation", className = "" }: WhyThisProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  if (!reason) return null;

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex min-h-11 items-center gap-1 text-[11px] text-mist-500 transition-colors hover:text-sky-400"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {t("whyThis")}
      </button>
      {open && (
        <div className="glass absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl p-3 text-xs text-mist-200 shadow-xl">
          <p>{reason}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wide text-mist-500">{label}</p>
        </div>
      )}
    </span>
  );
}
