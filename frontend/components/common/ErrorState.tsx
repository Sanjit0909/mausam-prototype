"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact }: ErrorStateProps) {
  const { t } = useLanguage();
  const displayMessage = message || t("common.errorDefault");
  return (
    <div
      className={`glass flex flex-col items-center justify-center gap-3 text-center ${
        compact ? "p-6" : "p-10"
      } rounded-3xl`}
    >
      <div className="rounded-full bg-rose-500/10 p-3">
        <AlertTriangle className="h-6 w-6 text-rose-400" />
      </div>
      <p className="max-w-xs text-sm text-mist-300">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-sm font-medium text-mist-100 transition-colors hover:bg-white/[0.14]"
        >
          <RefreshCw className="h-4 w-4" /> {t("common.retry")}
        </button>
      )}
    </div>
  );
}
