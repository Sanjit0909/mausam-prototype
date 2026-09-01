import { apiFetch, buildQuery } from "@/lib/api/client";
import type { AirQualityResponse, AstronomyResponse, HistoricalResponse, MarineResponse } from "@/lib/types";

export function getAirQuality(lat: number, lon: number, name?: string, signal?: AbortSignal) {
  return apiFetch<AirQualityResponse>(`/api/air-quality${buildQuery({ lat, lon, name })}`, { signal });
}

export function getMarine(lat: number, lon: number, name?: string, signal?: AbortSignal) {
  return apiFetch<MarineResponse>(`/api/marine${buildQuery({ lat, lon, name })}`, { signal });
}

export function getAstronomy(lat: number, lon: number, name?: string, signal?: AbortSignal) {
  return apiFetch<AstronomyResponse>(`/api/astronomy${buildQuery({ lat, lon, name })}`, { signal });
}

export function getHistorical(lat: number, lon: number, days = 30, name?: string, signal?: AbortSignal) {
  return apiFetch<HistoricalResponse>(`/api/historical${buildQuery({ lat, lon, days, name })}`, { signal });
}
