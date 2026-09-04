"use client";

import { useCallback, useEffect, useState } from "react";
import { getAlerts } from "@/lib/api/alerts";
import { getAirQuality, getAstronomy, getMarine } from "@/lib/api/environment";
import { getInsights } from "@/lib/api/insights";
import { getCurrentWeather, getForecast } from "@/lib/api/weather";
import { getInteractionQueryString } from "@/hooks/useInteractionTracking";
import type {
  AirQualityResponse,
  AlertsResponse,
  AstronomyResponse,
  ForecastResponse,
  InsightsResponse,
  MarineResponse,
  WeatherResponse,
} from "@/lib/types";

interface HomeData {
  weather: WeatherResponse | null;
  forecast: ForecastResponse | null;
  airQuality: AirQualityResponse | null;
  alerts: AlertsResponse | null;
  insights: InsightsResponse | null;
  astronomy: AstronomyResponse | null;
  marine: MarineResponse | null;
}

interface UseHomeDataResult extends HomeData {
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useHomeData(lat: number, lon: number, name: string | undefined, interests: string[]): UseHomeDataResult {
  const [data, setData] = useState<HomeData>({
    weather: null,
    forecast: null,
    airQuality: null,
    alerts: null,
    insights: null,
    astronomy: null,
    marine: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const [weatherRes, forecastRes, airQualityRes, alertsRes, insightsRes, astronomyRes, marineRes] = await Promise.allSettled([
        getCurrentWeather(lat, lon, name, controller.signal),
        getForecast(lat, lon, 7, name, controller.signal),
        getAirQuality(lat, lon, name, controller.signal),
        getAlerts(lat, lon, name, controller.signal),
        getInsights(lat, lon, interests, name, controller.signal, getInteractionQueryString()),
        getAstronomy(lat, lon, name, controller.signal),
        getMarine(lat, lon, name, controller.signal),
      ]);

      if (cancelled) return;

      const weather = weatherRes.status === "fulfilled" ? weatherRes.value : null;

      // Weather is the one truly load-bearing call - everything else degrades gracefully.
      if (!weather) {
        setError("Unable to load live weather data right now. Please try again.");
        setLoading(false);
        return;
      }

      setData({
        weather,
        forecast: forecastRes.status === "fulfilled" ? forecastRes.value : null,
        airQuality: airQualityRes.status === "fulfilled" ? airQualityRes.value : null,
        alerts: alertsRes.status === "fulfilled" ? alertsRes.value : null,
        insights: insightsRes.status === "fulfilled" ? insightsRes.value : null,
        astronomy: astronomyRes.status === "fulfilled" ? astronomyRes.value : null,
        marine: marineRes.status === "fulfilled" ? marineRes.value : null,
      });
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon, name, interests.join(","), tick]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...data, loading, error, refresh };
}
