import { API_BASE_URL, apiFetch } from "@/lib/api/client";
import type { ChatMessage, ChatRequest, ChatResponse } from "@/lib/types";

export function sendChatMessage(
  message: string,
  lat: number,
  lon: number,
  locationName: string | undefined,
  interests: string[],
  history: ChatMessage[],
  locale: string = "en",
  primaryPersona?: string,
  personaProfileJson?: string
) {
  const payload: ChatRequest = {
    message,
    lat,
    lon,
    location_name: locationName,
    interests,
    units: "metric",
    history,
    locale,
    primary_persona: primaryPersona,
    persona_profile_json: personaProfileJson,
  };
  return apiFetch<ChatResponse>("/api/ai/chat", { method: "POST", body: payload, timeoutMs: 28000 });
}

export interface StreamMeta {
  source?: string;
  model?: string;
}

export async function streamChatMessage(
  message: string,
  lat: number,
  lon: number,
  locationName: string | undefined,
  interests: string[],
  history: ChatMessage[],
  locale: string = "en",
  onToken: (token: string) => void,
  onComplete?: (meta: StreamMeta) => void,
  signal?: AbortSignal,
  primaryPersona?: string,
  personaProfileJson?: string
): Promise<string> {
  const payload: ChatRequest = {
    message,
    lat,
    lon,
    location_name: locationName,
    interests,
    units: "metric",
    history,
    locale,
    primary_persona: primaryPersona,
    persona_profile_json: personaProfileJson,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Streaming failed with status ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const chunk = JSON.parse(trimmed.slice(6));
          if (chunk.token) {
            accumulated += chunk.token;
            onToken(chunk.token);
          }
          if (chunk.done) {
            onComplete?.({ source: chunk.source, model: chunk.model });
          }
        } catch {
          // ignore parse errors on fragmented lines
        }
      }
    }

    if (buffer.trim().startsWith("data: ")) {
      try {
        const chunk = JSON.parse(buffer.trim().slice(6));
        if (chunk.token) {
          accumulated += chunk.token;
          onToken(chunk.token);
        }
        if (chunk.done) {
          onComplete?.({ source: chunk.source, model: chunk.model });
        }
      } catch {
        // ignore
      }
    }

    return accumulated;
  } catch (err) {
    // Fallback to non-streaming if stream is aborted by network or fails
    if (signal?.aborted) throw err;
    const fallback = await sendChatMessage(
      message,
      lat,
      lon,
      locationName,
      interests,
      history,
      locale,
      primaryPersona,
      personaProfileJson
    );
    onToken(fallback.reply);
    onComplete?.({ source: fallback.source, model: fallback.model ?? undefined });
    return fallback.reply;
  }
}

