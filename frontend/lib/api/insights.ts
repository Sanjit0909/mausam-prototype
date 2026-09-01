import { apiFetch, buildQuery } from "@/lib/api/client";
import type { InsightsResponse } from "@/lib/types";

export function getInsights(lat: number, lon: number, interests: string[], name?: string, signal?: AbortSignal) {
  return apiFetch<InsightsResponse>(
    `/api/insights${buildQuery({ lat, lon, name, interests: interests.join(",") })}`,
    { signal }
  );
}
