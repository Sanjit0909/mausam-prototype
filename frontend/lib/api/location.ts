import { apiFetch, buildQuery } from "@/lib/api/client";
import type { LocationSearchResult } from "@/lib/types";

export function searchLocations(query: string, signal?: AbortSignal) {
  return apiFetch<LocationSearchResult[]>(`/api/location/search${buildQuery({ q: query })}`, { signal });
}

export function reverseGeocode(lat: number, lon: number, signal?: AbortSignal) {
  return apiFetch<LocationSearchResult | null>(`/api/location/reverse${buildQuery({ lat, lon })}`, { signal });
}
