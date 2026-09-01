import { Activity, AlertCircle, CheckCircle2, Snowflake, Sun, Thermometer, Umbrella, Wind } from "lucide-react";
import type { PersonalizedInsight as PersonalizedInsightType } from "@/lib/types";

const ICONS: Record<string, typeof Sun> = {
  sun: Sun,
  wind: Wind,
  umbrella: Umbrella,
  thermometer: Thermometer,
  activity: Activity,
  snowflake: Snowflake,
  "check-circle": CheckCircle2,
  info: AlertCircle,
};

export function PersonalizedInsight({ insight }: { insight: PersonalizedInsightType }) {
  const Icon = ICONS[insight.icon] ?? AlertCircle;

  return (
    <div className="glass glass-hover flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.05] px-5 py-4 animate-fade-in-up">
      <div className="rounded-xl bg-sky-500/10 p-2 shrink-0">
        <Icon className="h-5 w-5 text-sky-300" />
      </div>
      <p className="text-sm text-mist-200">{insight.message}</p>
    </div>
  );
}
