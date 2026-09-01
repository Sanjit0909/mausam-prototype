import { AlertTriangle, CloudRain, Flame, ShieldCheck, Snowflake, Wind } from "lucide-react";
import { severityColor } from "@/lib/utils/format";
import type { WeatherAlert } from "@/lib/types";

const TYPE_ICONS: Record<string, typeof AlertTriangle> = {
  heat: Flame,
  cold: Snowflake,
  wind: Wind,
  rain: CloudRain,
  storm: AlertTriangle,
  aqi: Wind,
  uv: Flame,
  fog: AlertTriangle,
};

export function AlertCard({ alert }: { alert: WeatherAlert }) {
  const Icon = TYPE_ICONS[alert.alert_type] ?? AlertTriangle;

  return (
    <div className={`glass rounded-3xl p-5 border ${severityColor(alert.severity)}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/5 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-mist-100">{alert.title}</h4>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mist-300">
              {alert.severity}
            </span>
            {alert.source === "official" ? (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Official (NWS)
              </span>
            ) : (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-mist-400">
                Advisory
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-mist-300">{alert.description}</p>
        </div>
      </div>
    </div>
  );
}
