"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message = "Something went wrong. Please try again.", onRetry, compact }: ErrorStateProps) {
  return (
    <div
      className={`glass rounded-3xl flex flex-col items-center justify-center text-center gap-3 ${
        compact ? "p-6" : "p-10"
      }`}
    >
      <div className="rounded-full bg-rose-500/10 p-3">
        <AlertTriangle className="h-6 w-6 text-rose-400" />
      </div>
      <p className="text-mist-300 text-sm max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 inline-flex items-center gap-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] transition-colors px-4 py-2 text-sm font-medium text-mist-100"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}
