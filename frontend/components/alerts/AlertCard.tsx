import { AlertTriangle, CloudRain, Flame, MapPin, Snowflake, Wind } from "lucide-react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { useLanguage } from "@/context/LanguageContext";
import { localizeAlertDescription, localizeAlertTitle } from "@/lib/i18n/localizeAlert";
import { localizeProviderLabel, severityColor } from "@/lib/utils/format";
import type { TranslationKey } from "@/lib/i18n/translations";
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

const SEVERITY_KEYS: Record<string, TranslationKey> = {
  minor: "alerts.severity.minor",
  moderate: "alerts.severity.moderate",
  severe: "alerts.severity.severe",
  extreme: "alerts.severity.extreme",
};

export function AlertCard({ alert }: { alert: WeatherAlert }) {
  const { t, locale } = useLanguage();
  const Icon = TYPE_ICONS[alert.alert_type] ?? AlertTriangle;
  const isImd = alert.source === "IMD";
  const severityKey = SEVERITY_KEYS[alert.severity];
  const severityLabel = severityKey ? t(severityKey) : alert.severity;
  const title = localizeAlertTitle(alert.title, locale);
  const description = localizeAlertDescription(alert.description, locale);

  return (
    <div className={`glass rounded-3xl p-5 border ${severityColor(alert.severity)}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/5 p-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-mist-100">{title}</h4>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mist-300">
              {severityLabel}
            </span>
            <SourceBadge
              provider={localizeProviderLabel(alert.provider_label || alert.source, t)}
              updatedAt={alert.updated_at || alert.issued_at}
              official={isImd}
            />
          </div>
          <p className="mt-1.5 text-sm text-mist-300">{description}</p>
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
