import type { ApiErrorPayload } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  source?: string | null;
  status: number;

  constructor(message: string, status: number, source?: string | null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.source = source;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Thin fetch wrapper for the FastAPI backend. Centralizes:
 * - base URL resolution
 * - timeout handling (so a slow upstream API never hangs the UI forever)
 * - consistent, user-safe error messages (never raw stack traces)
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 12000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: options.signal ?? controller.signal,
    });

    if (!res.ok) {
      let payload: Partial<ApiErrorPayload> = {};
      try {
        payload = await res.json();
      } catch {
        // Non-JSON error body (e.g. proxy/network error page) - fall through to generic message.
      }
      throw new ApiError(payload.message || "Something went wrong. Please try again.", res.status, payload.source);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The request took too long. Please try again.", 408);
    }
    throw new ApiError("Unable to reach the weather service. Check your connection.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
