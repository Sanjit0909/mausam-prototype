import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun } from "lucide-react";
import type { ConditionGroup } from "@/lib/types";

interface WeatherIconProps {
  group: ConditionGroup;
  isDay?: boolean;
  className?: string;
}

export function WeatherIcon({ group, isDay = true, className = "h-8 w-8" }: WeatherIconProps) {
  switch (group) {
    case "clear":
      return isDay ? <Sun className={className} /> : <Moon className={className} />;
    case "cloudy":
      return isDay ? <CloudSun className={className} /> : <CloudMoon className={className} />;
    case "fog":
      return <CloudFog className={className} />;
    case "drizzle":
      return <CloudDrizzle className={className} />;
    case "rain":
      return <CloudRain className={className} />;
    case "snow":
      return <CloudSnow className={className} />;
    case "storm":
      return <CloudLightning className={className} />;
    default:
      return <Cloud className={className} />;
  }
}
