import { Activity, AlertCircle, CheckCircle2, Snowflake, Sun, Thermometer, Umbrella, Wind } from "lucide-react";
import { WhyThis } from "@/components/common/WhyThis";
import { useLanguage } from "@/context/LanguageContext";
import { localizeInsightMessage } from "@/lib/i18n/localizeAlert";
import type { PersonalizedInsight as PersonalizedInsightType } from "@/lib/types";

const ICONS: Record<string, typeof Sun> = {
  sun: Sun,
  wind: Wind,
  umbrella: Umbrella,
  thermometer: Thermometer,
  activity: Activity,
  snowflake: Snowflake,
  "check-circle": CheckCircle2,
  heart: AlertCircle,
  info: AlertCircle,
};

export function PersonalizedInsight({ insight }: { insight: PersonalizedInsightType }) {
  const { locale } = useLanguage();
  const Icon = ICONS[insight.icon] ?? AlertCircle;
  const message = localizeInsightMessage(insight.message, locale);

  return (
    <div className="glass glass-hover flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] px-5 py-4 animate-fade-in-up">
      <div className="rounded-xl bg-sky-500/10 p-2 shrink-0">
        <Icon className="h-5 w-5 text-sky-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-mist-200">{message}</p>
        {insight.reason && <WhyThis reason={insight.reason} label={insight.label} className="mt-1" />}
      </div>
    </div>
  );
}
