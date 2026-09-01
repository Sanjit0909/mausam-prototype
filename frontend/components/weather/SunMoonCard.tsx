import { Moon, Sunrise, Sunset } from "lucide-react";
import { formatTime } from "@/lib/utils/format";
import type { AstronomyResponse } from "@/lib/types";

export function SunMoonCard({ data }: { data: AstronomyResponse }) {
  return (
    <div className="glass glass-hover rounded-3xl p-5 flex flex-col gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-mist-400">Sun &amp; Moon</span>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2">
          <Sunrise className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-mist-100">{formatTime(data.sunrise, data.location.timezone)}</p>
            <p className="text-[11px] text-mist-400">Sunrise</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sunset className="h-5 w-5 text-rose-400" />
          <div>
            <p className="text-sm font-medium text-mist-100">{formatTime(data.sunset, data.location.timezone)}</p>
            <p className="text-[11px] text-mist-400">Sunset</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-white/5 pt-3">
        <Moon className="h-5 w-5 text-mist-300" />
        <div>
          <p className="text-sm font-medium text-mist-100">
            {data.moon_phase} &middot; {data.moon_illumination.toFixed(0)}% lit
          </p>
          <p className="text-[11px] text-mist-400">Moonrise/moonset not available for this location</p>
        </div>
      </div>
    </div>
  );
}
