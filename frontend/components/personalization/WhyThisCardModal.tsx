"use client";

import { X, Pin, EyeOff, Sparkles, Check, Info } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { ScoreBreakdown } from "@/lib/personalization/rankingEngine";

interface WhyThisCardModalProps {
  breakdown: ScoreBreakdown | null;
  cardTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onTogglePin?: () => void;
  onHide?: () => void;
}

export function WhyThisCardModal({
  breakdown,
  cardTitle,
  isOpen,
  onClose,
  onTogglePin,
  onHide,
}: WhyThisCardModalProps) {
  const { locale } = useLanguage();

  if (!isOpen || !breakdown) return null;

  const isHindi = locale === "hi";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in-up"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-white/30 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950 p-6 shadow-2xl text-slate-800 dark:text-neutral-100 backdrop-blur-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/5 text-slate-500 dark:text-neutral-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              {isHindi ? "व्यक्तिगत प्राथमिकता विश्लेषण" : "Personalization Factor Breakdown"}
            </span>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              {cardTitle}
            </h3>
          </div>
        </div>

        {/* Primary reason banner */}
        <div className="mb-5 rounded-2xl border border-sky-400/30 bg-sky-500/10 p-3.5 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">
              {isHindi ? "शीर्ष प्राथमिकता कारण:" : "Primary Ranking Trigger:"}
            </p>
            <p className="text-xs text-slate-700 dark:text-neutral-200 mt-0.5 font-medium">
              {isHindi ? breakdown.topReasonHi : breakdown.topReasonEn}
            </p>
          </div>
        </div>

        {/* Multi-Factor Score Bars */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700 dark:text-neutral-200">
              {isHindi ? "कुल प्राथमिकता स्कोर:" : "Total Personalization Score:"}
            </span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-sm">
              {Math.max(0, breakdown.totalScore)} pts
            </span>
          </div>

          {/* 1. Persona Relevance */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-300 mb-1 font-medium">
              <span>{isHindi ? "प्रोफाइल प्रासंगिकता (Persona)" : "Persona Match Relevance"}</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{breakdown.personaPoints} / 40</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(breakdown.personaPoints / 40) * 100}%` }}
              />
            </div>
          </div>

          {/* 2. Live Weather Trigger */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-300 mb-1 font-medium">
              <span>{isHindi ? "लाइव मौसम गंभीरता ट्रिगर" : "Live Weather Severity Boost"}</span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">+{breakdown.severityPoints} / 25</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${(breakdown.severityPoints / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* 3. Time of Day Context */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-300 mb-1 font-medium">
              <span>{isHindi ? "समय संदर्भ (सुबह / शाम)" : "Time of Day Context"}</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">+{breakdown.timePoints} / 15</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500"
                style={{ width: `${(breakdown.timePoints / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* 4. Location Factor */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-300 mb-1 font-medium">
              <span>{isHindi ? "भौगोलिक स्थान अनुकूलता" : "Geographic Relevance"}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">+{Math.max(0, breakdown.locationPoints)} / 10</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(Math.max(0, breakdown.locationPoints) / 10) * 100}%` }}
              />
            </div>
          </div>

          {/* 5. User Interaction / Pinning */}
          {breakdown.userPrefPoints > 0 && (
            <div>
              <div className="flex justify-between text-[11px] text-slate-600 dark:text-neutral-300 mb-1 font-medium">
                <span>{isHindi ? "उपयोगकर्ता प्राथमिकता (पिन किया गया)" : "User Customization (Pinned)"}</span>
                <span className="font-mono text-pink-600 dark:text-pink-400 font-semibold">+{breakdown.userPrefPoints} pts</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full w-full" />
              </div>
            </div>
          )}
        </div>

        {/* User Control Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
          {onTogglePin && (
            <button
              onClick={() => {
                onTogglePin();
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold transition-all active:scale-95 ${
                breakdown.isPinned
                  ? "bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                  : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-neutral-200 hover:bg-slate-200 dark:hover:bg-white/10"
              }`}
            >
              <Pin className={`h-3.5 w-3.5 ${breakdown.isPinned ? "fill-sky-600 dark:fill-sky-300" : ""}`} />
              <span>
                {breakdown.isPinned
                  ? isHindi ? "अनपिन करें" : "Unpin"
                  : isHindi ? "शीर्ष पर पिन करें" : "Pin to Top"}
              </span>
            </button>
          )}

          {onHide && (
            <button
              onClick={() => {
                onHide();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 transition-all active:scale-95"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>{isHindi ? "छिपाएं" : "Hide Card"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
