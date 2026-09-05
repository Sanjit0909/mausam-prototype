"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { formatHourLabel } from "@/lib/utils/format";
import type { HourlyPoint } from "@/lib/types";

interface WeatherChartProps {
  hourly: HourlyPoint[];
  variant?: "temperature" | "rain";
  limit?: number;
}

interface TooltipPayloadItem {
  value: number;
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix,
  locale,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  suffix: string;
  locale: string;
}) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs">
      <p className="text-mist-400">{label ? formatHourLabel(label, locale) : ""}</p>
      <p className="font-semibold text-mist-100">
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}

export function WeatherChart({ hourly, variant = "temperature", limit = 24 }: WeatherChartProps) {
  const { locale, t } = useLanguage();
  const data = hourly.slice(0, limit).map((h) => ({
    time: h.time,
    temperature: Math.round(h.temperature),
    rain: Math.round(h.precipitation_probability ?? 0),
  }));

  const tickFmt = (value: string) => formatHourLabel(value, locale);

  if (variant === "rain") {
    return (
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="time"
              tickFormatter={tickFmt}
              tick={{ fill: "#8b9bc2", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={2}
            />
            <YAxis tick={{ fill: "#8b9bc2", fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit="%" />
            <Tooltip content={<ChartTooltip suffix={t("home.chartRainSuffix")} locale={locale} />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="rain" fill="#29b6f6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4fc3f7" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4fc3f7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={tickFmt}
            tick={{ fill: "#8b9bc2", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis tick={{ fill: "#8b9bc2", fontSize: 11 }} axisLine={false} tickLine={false} width={36} unit="\u00b0" />
          <Tooltip content={<ChartTooltip suffix="\u00b0" locale={locale} />} cursor={{ stroke: "rgba(255,255,255,0.15)" }} />
          <Area type="monotone" dataKey="temperature" stroke="#4fc3f7" strokeWidth={2} fill="url(#tempGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
