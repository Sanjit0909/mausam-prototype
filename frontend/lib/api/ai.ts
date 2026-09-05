import { apiFetch } from "@/lib/api/client";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/lib/types";

export function sendChatMessage(
  message: string,
  lat: number,
  lon: number,
  locationName: string | undefined,
  interests: string[],
  history: ChatMessage[]
) {
  const payload: ChatRequest = {
    message,
    lat,
    lon,
    location_name: locationName,
    interests,
    units: "metric",
    history,
  };
  return apiFetch<ChatResponse>("/api/ai/chat", { method: "POST", body: payload, timeoutMs: 22000 });
}
