import { apiFetch, buildQuery } from "@/lib/api/client";
import type { ForecastResponse, WeatherResponse } from "@/lib/types";

export function getCurrentWeather(lat: number, lon: number, name?: string, signal?: AbortSignal) {
  return apiFetch<WeatherResponse>(`/api/weather${buildQuery({ lat, lon, name })}`, { signal });
}

export function getForecast(lat: number, lon: number, days = 7, name?: string, signal?: AbortSignal) {
  return apiFetch<ForecastResponse>(`/api/forecast${buildQuery({ lat, lon, days, name })}`, { signal });
}
