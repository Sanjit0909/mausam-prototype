"use client";

/**
 * Lightweight, transparent interaction tracking (spec section 10 - "adaptive behavior").
 * No ML, no backend persistence - just a localStorage counter per card key, sent to
 * /api/insights as a simple `card:count,card:count` string so the scoring engine can give
 * frequently-checked cards a small boost. Purely additive: if this is empty/unavailable,
 * personalization still works fine from persona/severity/time/season alone.
 */
const STORAGE_KEY = "mausam:cardInteractions";
const MAX_TRACKED_CARDS = 12;

function readCounts(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Storage may be unavailable (private mode) - tracking is a nice-to-have, never fatal.
  }
}

export function trackCardInteraction(cardKey: string) {
  const counts = readCounts();
  counts[cardKey] = (counts[cardKey] || 0) + 1;

  // Keep only the most-interacted cards to avoid unbounded growth over a long session.
  const trimmed = Object.fromEntries(
    Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, MAX_TRACKED_CARDS)
  );
  writeCounts(trimmed);
}

export function getInteractionQueryString(): string {
  const counts = readCounts();
  return Object.entries(counts)
    .map(([card, count]) => `${card}:${count}`)
    .join(",");
}

export function useInteractionTracking() {
  return { trackCardInteraction, getInteractionQueryString };
}
