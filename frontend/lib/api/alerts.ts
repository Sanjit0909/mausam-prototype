import { apiFetch, buildQuery } from "@/lib/api/client";
import type { AlertsResponse } from "@/lib/types";

export function getAlerts(lat: number, lon: number, name?: string, signal?: AbortSignal) {
  return apiFetch<AlertsResponse>(`/api/alerts${buildQuery({ lat, lon, name })}`, { signal });
}
