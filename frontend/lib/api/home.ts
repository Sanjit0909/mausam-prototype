import { apiFetch, buildQuery } from "@/lib/api/client";
import type { HomeBundle, PersonaProfile } from "@/lib/types";

export function getHomeBundle(
  lat: number,
  lon: number,
  interests: string[],
  name?: string,
  signal?: AbortSignal,
  interaction?: string,
  personaProfile?: PersonaProfile | null
) {
  const farmer = personaProfile?.farmer;
  return apiFetch<HomeBundle>(
    `/api/home${buildQuery({
      lat,
      lon,
      name,
      interests: interests.join(","),
      interaction,
      persona_profile: personaProfile ? JSON.stringify(personaProfile) : undefined,
      crop: farmer?.crop,
      crop_stage: farmer?.crop_stage,
      primary_persona: personaProfile?.primary_persona || undefined,
    })}`,
    { signal, timeoutMs: 15000 }
  );
}
