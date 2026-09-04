import { Waves } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { formatTime, providerDisplayName } from "@/lib/utils/format";
import type { MarineResponse } from "@/lib/types";

export function MarineCard({ data }: { data: MarineResponse }) {
  if (!data.available || !data.current) {
    return null;
  }

  const { current } = data;

  return (
    <div className="glass glass-hover rounded-3xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">Marine &amp; Tides</span>
        <Waves className="h-4 w-4 text-sky-400" />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-2xl font-semibold text-mist-100">{current.wave_height?.toFixed(1) ?? "--"}m</p>
          <p className="text-[11px] text-mist-400">Wave height</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-mist-100">{current.wave_period?.toFixed(0) ?? "--"}s</p>
          <p className="text-[11px] text-mist-400">Wave period</p>
        </div>
      </div>

      <SourceBadge provider={providerDisplayName(data.source)} kind="Wave & Swell" />

      {data.tides.length > 0 && (
        <div className="border-t border-white/5 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-mist-400">Today&apos;s tides</p>
            {data.is_demo_tide ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                Sample data
              </span>
            ) : (
              <SourceBadge provider="Stormglass" kind="Real Tide Data" />
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mist-300">
            {data.tides.map((t, i) => (
              <span key={i} className="capitalize">
                {t.type} {formatTime(t.time.length <= 5 ? `1970-01-01T${t.time}` : t.time)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
