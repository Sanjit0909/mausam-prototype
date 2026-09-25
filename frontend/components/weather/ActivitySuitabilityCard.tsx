"use client";

import { useMemo } from "react";
import { Activity, Footprints, Frown, Meh, Smile } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { CurrentWeather, HourlyPoint } from "@/lib/types";

interface ActivitySuitabilityCardProps {
  current: CurrentWeather;
  hourly?: HourlyPoint[];
  activityName?: string;
}

export function ActivitySuitabilityCard({
  current,
  hourly = [],
  activityName = "Running",
}: ActivitySuitabilityCardProps) {
  const { locale } = useLanguage();

  // Evaluate suitability based on Temperature, Humidity, and Condition
  const evaluation = useMemo(() => {
    const temp = current.temperature;
    const hum = current.humidity ?? 60;
    const rain = (current.precipitation ?? 0) > 0;

    if (rain || temp > 36 || (temp > 32 && hum > 70)) {
      return {
        rating: locale === "hi" ? "खराब" : "Poor",
        desc:
          locale === "hi"
            ? "अभी बाहरी दौड़ के लिए मौसम प्रतिकूल है"
            : "Poor weather for running right now",
        color: "text-rose-300 dark:text-rose-400",
        bg: "bg-rose-500/20 border-rose-400/30",
        icon: Frown,
      };
    }
    if (temp > 30 || hum > 80 || temp < 10) {
      return {
        rating: locale === "hi" ? "मध्यम" : "Fair",
        desc:
          locale === "hi"
            ? "मध्यम स्थितियां; पर्याप्त पानी पिएं"
            : "Moderate conditions; stay well hydrated",
        color: "text-amber-200 dark:text-amber-300",
        bg: "bg-amber-500/20 border-amber-400/30",
        icon: Meh,
      };
    }
    return {
      rating: locale === "hi" ? "उत्कृष्ट" : "Ideal",
      desc:
        locale === "hi"
          ? "दौड़ और आउटडोर व्यायाम के लिए आदर्श मौसम"
          : "Ideal weather for running and outdoor exercise",
      color: "text-emerald-200 dark:text-emerald-400",
      bg: "bg-emerald-500/20 border-emerald-400/30",
      icon: Smile,
    };
  }, [current, locale]);

  // Next 3 hours timeline
  const upcomingHours = useMemo(() => {
    const hours = hourly.slice(1, 4);
    return hours.map((h, i) => {
      const timeStr = new Date(h.time).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const temp = h.temperature;
      const isBad = temp > 33 || (h.precipitation_probability ?? 0) > 40;
      const isGood = temp >= 18 && temp <= 28 && (h.precipitation_probability ?? 0) < 20;

      return {
        time: timeStr,
        label: isBad ? (locale === "hi" ? "खराब" : "Poor") : isGood ? (locale === "hi" ? "उत्कृष्ट" : "Good") : (locale === "hi" ? "मध्यम" : "Fair"),
        Icon: isBad ? Frown : isGood ? Smile : Meh,
        color: isBad ? "text-rose-300" : isGood ? "text-emerald-300" : "text-amber-300",
      };
    });
  }, [hourly, locale]);

  const MoodIcon = evaluation.icon;

  return (
    <div className="glass group relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 bg-white/[0.22] dark:bg-transparent border-white/40 dark:border-white/10 shadow-lg">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white dark:text-neutral-300 drop-shadow-sm">
          <Footprints className="h-4 w-4 text-sky-100 dark:text-sky-400" />
          <span>{locale === "hi" ? "आउटडोर दौड़ / फिटनेस" : activityName}</span>
        </span>

        {/* 3 hours timeline with mood icons (Matching Screenshot) */}
        {upcomingHours.length > 0 && (
          <div className="flex items-center gap-3">
            {upcomingHours.map((slot, i) => {
              const SlotIcon = slot.Icon;
              return (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[10px] font-semibold text-white/80 dark:text-neutral-500">{slot.time}</span>
                  <div className="mt-0.5 flex items-center gap-0.5">
                    <SlotIcon className={`h-3 w-3 ${slot.color}`} />
                    <span className={`text-[10px] font-bold ${slot.color}`}>{slot.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-2">
          <MoodIcon className={`h-6 w-6 ${evaluation.color}`} />
          <p className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
            {evaluation.rating}
          </p>
        </div>
        <p className="mt-1 text-xs font-medium text-white/90 dark:text-neutral-400">
          {evaluation.desc}
        </p>
      </div>

      {/* Pagination dots (decorative matching screenshot) */}
      <div className="mt-3 flex items-center justify-center gap-1">
        <span className="h-1.5 w-3 rounded-full bg-white/80 dark:bg-white/60" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/30 dark:bg-white/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/30 dark:bg-white/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/30 dark:bg-white/20" />
      </div>
    </div>
  );
}
