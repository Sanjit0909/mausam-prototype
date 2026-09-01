import type { LucideIcon } from "lucide-react";

interface WeatherMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sublabel?: string;
  accentClassName?: string;
}

export function WeatherMetricCard({ icon: Icon, label, value, sublabel, accentClassName = "text-sky-400" }: WeatherMetricCardProps) {
  return (
    <div className="glass glass-hover rounded-3xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-mist-400">{label}</span>
        <Icon className={`h-4 w-4 ${accentClassName}`} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-mist-100">{value}</p>
        {sublabel && <p className="text-xs text-mist-400 mt-1">{sublabel}</p>}
      </div>
    </div>
  );
}
