import { apiFetch, buildQuery } from "@/lib/api/client";
import type { HomeBundle } from "@/lib/types";

export function getHomeBundle(
  lat: number,
  lon: number,
  interests: string[],
  name?: string,
  signal?: AbortSignal,
  interaction?: string
) {
  return apiFetch<HomeBundle>(
    `/api/home${buildQuery({ lat, lon, name, interests: interests.join(","), interaction })}`,
    { signal, timeoutMs: 15000 }
  );
}
