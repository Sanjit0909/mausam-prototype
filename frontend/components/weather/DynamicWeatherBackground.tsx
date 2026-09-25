"use client";

import React, { useMemo } from "react";
import { useTheme } from "@/context/ThemeContext";
import type { ConditionGroup } from "@/lib/types";

interface DynamicWeatherBackgroundProps {
  conditionGroup?: ConditionGroup;
  isDay?: boolean;
}

export function DynamicWeatherBackground({
  conditionGroup = "clear",
  isDay = true,
}: DynamicWeatherBackgroundProps) {
  const { theme } = useTheme();

  const atmosphericStyle = useMemo(() => {
    if (theme === "dark") {
      return {
        backgroundColor: "#000000",
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 255, 255, 0.03), transparent 70%)",
      };
    }

    // Light Theme: Adapts dynamically based on weather conditions (Reference: Screenshot)
    if (!isDay) {
      // Night Sky: Deep calm twilight indigo
      return {
        backgroundColor: "#0a1522",
        backgroundImage: `
          linear-gradient(180deg, #142030 0%, #0b1522 40%, #060d15 75%, #020508 100%),
          radial-gradient(circle at 80% 15%, rgba(224, 242, 254, 0.15) 0%, transparent 40%)
        `,
      };
    }

    switch (conditionGroup) {
      case "rain":
      case "drizzle":
        return {
          backgroundColor: "#153d54",
          backgroundImage: `
            linear-gradient(180deg, #22516f 0%, #1a425b 30%, #14374d 60%, #0f2c3e 85%, #091e2b 100%),
            radial-gradient(ellipse 90% 40% at 50% 0%, rgba(186, 230, 253, 0.12), transparent 70%)
          `,
        };
      case "storm":
        return {
          backgroundColor: "#122536",
          backgroundImage: `
            linear-gradient(180deg, #193144 0%, #122432 40%, #0d1a24 75%, #081017 100%),
            radial-gradient(ellipse 80% 40% at 60% 0%, rgba(147, 197, 253, 0.10), transparent 70%)
          `,
        };
      case "cloudy":
        return {
          backgroundColor: "#2e4f63",
          backgroundImage: `
            linear-gradient(180deg, #446982 0%, #527891 25%, #416277 60%, #304a5b 85%, #223542 100%),
            radial-gradient(ellipse 100% 50% at 50% -10%, rgba(255, 255, 255, 0.20), transparent 75%)
          `,
        };
      case "fog":
        return {
          backgroundColor: "#3c5a6d",
          backgroundImage: `
            linear-gradient(180deg, #537489 0%, #64869b 35%, #4c6a7d 70%, #374f5e 100%),
            radial-gradient(ellipse 100% 60% at 50% 20%, rgba(255, 255, 255, 0.22), transparent 80%)
          `,
        };
      case "clear":
      default:
        // Reference Weather App Screenshot: Soft, muted atmospheric daylight blue
        return {
          backgroundColor: "#185a6e",
          backgroundImage: `
            linear-gradient(180deg, #5b9ec2 0%, #468cae 18%, #367d9f 35%, #256b87 55%, #185a6e 78%, #104757 100%),
            radial-gradient(ellipse 110% 45% at 50% -10%, rgba(255, 255, 255, 0.28) 0%, transparent 65%)
          `,
        };
    }
  }, [theme, conditionGroup, isDay]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 transition-all duration-700 ease-in-out"
      style={{
        ...atmosphericStyle,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
      }}
    >
      {/* Light Mode: Atmospheric Clouds, Gentle Horizon Mist, and Calming Dark Atmospheric Overlay */}
      {theme === "light" && (
        <>
          {/* Subtle Dark Atmospheric Overlay to control luminance and boost card/text contrast */}
          <div className="absolute inset-0 bg-[#002337]/[0.14] pointer-events-none" />

          {/* Top Sunlit Radiant Flare */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[120vw] max-w-7xl rounded-full bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-3xl pointer-events-none" />

          {/* Whispy high-altitude atmospheric clouds */}
          <div className="absolute top-12 left-10 h-44 w-96 rounded-full bg-white/10 blur-3xl animate-cloud-drift pointer-events-none" />
          <div className="absolute top-28 right-8 h-48 w-[32rem] rounded-full bg-white/[0.08] blur-3xl animate-cloud-drift [animation-delay:-14s] pointer-events-none" />

          {/* Gentle meadow/ocean horizon mist silhouette band at middle-lower depth */}
          <div className="absolute top-[420px] inset-x-0 h-40 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent blur-2xl pointer-events-none" />
        </>
      )}

      {/* Dark Mode: Pure OLED Black subtle vignette */}
      {theme === "dark" && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/20 via-black to-black pointer-events-none" />
      )}
    </div>
  );
}
