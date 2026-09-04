import { AlertTriangle, CloudRain, Flame, MapPin, Snowflake, Wind } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
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
  const isOfficial = alert.source === "IMD" || alert.source === "NWS";

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
            <SourceBadge provider={alert.provider_label} updatedAt={alert.updated_at || alert.issued_at} official={isOfficial} />
          </div>
          <p className="mt-1.5 text-sm text-mist-300">{alert.description}</p>
          {alert.area && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-mist-500">
              <MapPin className="h-3 w-3" /> {alert.area}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
