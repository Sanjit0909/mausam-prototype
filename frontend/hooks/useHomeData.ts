"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHomeBundle } from "@/lib/api/home";
import { getInteractionQueryString } from "@/hooks/useInteractionTracking";
import { useLanguage } from "@/context/LanguageContext";
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
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY: HomeData = {
  weather: null,
  forecast: null,
  airQuality: null,
  alerts: null,
  insights: null,
  astronomy: null,
  marine: null,
};

export function useHomeData(lat: number, lon: number, name: string | undefined, interests: string[]): UseHomeDataResult {
  const { t } = useLanguage();
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const hasDataRef = useRef(false);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      if (hasDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const bundle = await getHomeBundle(lat, lon, interests, name, controller.signal, getInteractionQueryString());
        if (cancelled) return;
        hasDataRef.current = true;
        setData({
          weather: bundle.weather,
          forecast: bundle.forecast,
          airQuality: bundle.air_quality,
          alerts: bundle.alerts,
          insights: bundle.insights,
          astronomy: bundle.astronomy,
          marine: bundle.marine,
        });
        setError(null);
      } catch {
        if (cancelled) return;
        if (!hasDataRef.current) {
          setError(t("home.loadError"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lon, name, interests.join(","), tick, t]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...data, loading, refreshing, error, refresh };
}
