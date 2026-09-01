import { Sun } from "lucide-react";
import { uvCategory } from "@/lib/utils/format";

export function UVCard({ uvIndex }: { uvIndex: number | null | undefined }) {
  const { label, color } = uvCategory(uvIndex);
  const pct = uvIndex !== null && uvIndex !== undefined ? Math.min(100, (uvIndex / 11) * 100) : 0;

  return (
    <div className="glass glass-hover rounded-3xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">UV Index</span>
        <Sun className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className={`text-2xl font-semibold ${color}`}>{uvIndex !== null && uvIndex !== undefined ? uvIndex.toFixed(0) : "--"}</p>
        <p className="text-xs text-mist-400 mt-1">{label}</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5">
        <div className={`h-1.5 rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
