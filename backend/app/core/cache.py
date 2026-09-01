"""Tiny in-memory TTL cache to avoid hammering upstream APIs during a demo.

Deliberately dependency-free (no Redis) - this is a single-process prototype.
"""
import time
from typing import Any, Awaitable, Callable


class TTLCache:
    def __init__(self, ttl_seconds: float = 300):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> Any | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (time.time() + self.ttl_seconds, value)

    async def get_or_set(self, key: str, factory: Callable[[], Awaitable[Any]]) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = await factory()
        self.set(key, value)
        return value

    def get_stale(self, key: str) -> Any | None:
        """Return a value even if expired - used as a last-resort fallback on API failure."""
        entry = self._store.get(key)
        return entry[1] if entry else None


def location_key(lat: float, lon: float, precision: int = 2) -> str:
    return f"{round(lat, precision)}:{round(lon, precision)}"
