import { ShieldCheck } from "lucide-react";

interface SourceBadgeProps {
  /** e.g. "IMD", "Open-Meteo", "OpenWeatherMap", "Stormglass", "MAUSAM Advisory" */
  provider: string;
  /** e.g. "Official Warning", "Forecast", "AQI", "Marine" */
  kind?: string;
  /** ISO timestamp this data was issued/observed - renders as a relative "Updated Xm ago". */
  updatedAt?: string | null;
  official?: boolean;
  className?: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return "";
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Reusable data-provenance label (spec section 21): "[Provider - Kind]" + freshness. Never
 * invents a provider name - always renders exactly what the backend reported as `source`. */
export function SourceBadge({ provider, kind, updatedAt, official = false, className = "" }: SourceBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        official ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/10 bg-white/5 text-mist-400"
      } ${className}`}
    >
      {official && <ShieldCheck className="h-3 w-3" />}
      <span>
        {provider}
        {kind ? ` \u2022 ${kind}` : ""}
      </span>
      {updatedAt && <span className="opacity-70">\u00b7 {timeAgo(updatedAt)}</span>}
    </span>
  );
}
