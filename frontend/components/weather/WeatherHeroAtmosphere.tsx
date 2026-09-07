"use client";

import React from "react";
import { useReducedMotion } from "@/components/common/Motion";
import type { ConditionGroup } from "@/lib/types";

interface WeatherHeroAtmosphereProps {
  conditionGroup?: ConditionGroup;
  isDay?: boolean;
}

export function WeatherHeroAtmosphere({
  conditionGroup = "clear",
  isDay = true,
}: WeatherHeroAtmosphereProps) {
  const reducedMotion = useReducedMotion();

  // If the user requested reduced motion, render a subtle, completely static ambient tint
  if (reducedMotion) {
    return (
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl opacity-30">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-navy-950/40" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
      {/* 1. CLEAR / SUNNY / STARRY NIGHT */}
      {conditionGroup === "clear" && (
        <>
          {isDay ? (
            <div className="absolute -top-12 -right-12 h-80 w-80 rounded-full bg-gradient-to-br from-amber-400/20 via-sky-400/15 to-transparent blur-3xl animate-sun-radiance" />
          ) : (
            <>
              <div className="absolute -top-10 -right-10 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/20 via-sky-900/15 to-transparent blur-3xl" />
              {/* Subtle twinkling night sky stars */}
              <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20%" cy="25%" r="1" fill="#fff" className="animate-pulse" />
                <circle cx="45%" cy="15%" r="1.2" fill="#93c5fd" className="animate-pulse [animation-delay:1s]" />
                <circle cx="75%" cy="30%" r="0.8" fill="#fff" className="animate-pulse [animation-delay:2s]" />
                <circle cx="85%" cy="18%" r="1" fill="#bfdbfe" className="animate-pulse [animation-delay:1.5s]" />
                <circle cx="35%" cy="40%" r="0.9" fill="#fff" className="animate-pulse [animation-delay:0.5s]" />
              </svg>
            </>
          )}
        </>
      )}

      {/* 2. CLOUDY / OVERCAST */}
      {conditionGroup === "cloudy" && (
        <div className="absolute inset-0">
          <div className="absolute -top-16 -left-10 h-64 w-96 rounded-full bg-sky-500/10 blur-3xl animate-cloud-drift" />
          <div className="absolute -top-8 right-0 h-72 w-80 rounded-full bg-slate-400/10 blur-3xl animate-cloud-drift [animation-delay:-12s]" />
          {/* Subtle cloud silhouette vectors */}
          <svg
            className="absolute -top-6 right-8 h-44 w-72 opacity-15 animate-cloud-drift"
            viewBox="0 0 200 120"
            fill="none"
          >
            <path
              d="M30 80 A25 25 0 0 1 70 65 A35 35 0 0 1 130 60 A28 28 0 0 1 175 80 Z"
              fill="currentColor"
              className="text-mist-300"
            />
          </svg>
        </div>
      )}

      {/* 3. RAIN / DRIZZLE */}
      {(conditionGroup === "rain" || conditionGroup === "drizzle") && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-500/10 via-slate-900/10 to-transparent blur-2xl" />
          {/* Subtle stylized vertical rain streaks */}
          <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <line x1="15%" y1="-10%" x2="13%" y2="110%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 24" />
            <line x1="38%" y1="-10%" x2="36%" y2="110%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="8 20" />
            <line x1="62%" y1="-10%" x2="60%" y2="110%" stroke="#7dd3fc" strokeWidth="1" strokeDasharray="5 28" />
            <line x1="82%" y1="-10%" x2="80%" y2="110%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="7 22" />
          </svg>
          {/* Gentle puddle ripple ring at the bottom */}
          <div className="absolute bottom-3 right-12 h-10 w-28 rounded-full border border-sky-400/20 opacity-30 animate-ping [animation-duration:5s]" />
        </div>
      )}

      {/* 4. THUNDERSTORM / STORM */}
      {conditionGroup === "storm" && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-transparent" />
          <div className="absolute -top-12 right-12 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl animate-pulse [animation-duration:7s]" />
          {/* Very restrained distant flash */}
          <div className="absolute top-0 right-1/4 h-48 w-48 rounded-full bg-sky-300/10 blur-2xl opacity-20 animate-pulse [animation-duration:9s]" />
        </div>
      )}

      {/* 5. MIST / FOG */}
      {conditionGroup === "fog" && (
        <div className="absolute inset-0">
          <div className="absolute -inset-8 bg-gradient-to-r from-transparent via-mist-300/10 to-transparent blur-3xl animate-cloud-drift [animation-duration:35s]" />
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-mist-200/10 to-transparent blur-xl" />
        </div>
      )}

      {/* 6. SNOW */}
      {conditionGroup === "snow" && (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-sky-100/5 to-transparent blur-2xl" />
          {/* Gentle floating crystalline dots */}
          <svg className="absolute inset-0 h-full w-full opacity-35" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18%" cy="20%" r="2" fill="#fff" className="animate-pulse [animation-duration:3s]" />
            <circle cx="42%" cy="45%" r="1.5" fill="#e0f2fe" className="animate-pulse [animation-duration:4s]" />
            <circle cx="68%" cy="25%" r="2.5" fill="#fff" className="animate-pulse [animation-duration:3.5s]" />
            <circle cx="84%" cy="60%" r="1.8" fill="#e0f2fe" className="animate-pulse [animation-duration:4.5s]" />
          </svg>
        </div>
      )}
    </div>
  );
}
