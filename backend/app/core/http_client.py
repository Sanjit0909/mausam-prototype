"""Shared async HTTP client for calling external weather/AI APIs."""
import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

_client: httpx.AsyncClient | None = None

# Generous timeouts + automatic connection-level retries: free-tier hosting (e.g. Render's
# free instances) has far less CPU than a local dev machine, so cold TLS handshakes and DNS
# lookups can genuinely take a few seconds longer than they did in local testing.
DEFAULT_TIMEOUT = httpx.Timeout(connect=15.0, read=20.0, write=10.0, pool=10.0)


def get_http_client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        transport = httpx.AsyncHTTPTransport(retries=2)
        _client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, transport=transport)
    return _client


async def close_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def get_with_backoff(url: str, params: dict, max_retries: int = 2) -> httpx.Response:
    """GET with automatic backoff specifically on 429 (rate limit) responses.

    Free-tier hosting platforms often share outbound IPs across many unrelated apps, so a
    keyless, IP-rate-limited API (like Open-Meteo's free tier) can return 429s that have
    nothing to do with this app's own traffic. A short retry-with-backoff recovers from
    transient bursts without needing a paid API plan.
    """
    client = get_http_client()
    last_response: httpx.Response | None = None

    for attempt in range(max_retries + 1):
        resp = await client.get(url, params=params)
        if resp.status_code != 429:
            resp.raise_for_status()
            return resp

        last_response = resp
        if attempt < max_retries:
            wait_seconds = float(resp.headers.get("Retry-After", 2 * (attempt + 1)))
            logger.warning("429 from %s, retrying in %.1fs (attempt %d/%d)", url, wait_seconds, attempt + 1, max_retries)
            await asyncio.sleep(min(wait_seconds, 10))

    last_response.raise_for_status()  # exhausted retries - raise the final 429
    return last_response  # unreachable, satisfies type checkers


class UpstreamAPIError(Exception):
    """Raised when an external weather/AI API fails or times out.

    Carries a short, user-safe message; the raw exception is logged server-side
    but never surfaced to the client (no stack traces reach the frontend).
    """

    def __init__(self, source: str, message: str = "Data temporarily unavailable"):
        self.source = source
        self.message = message
        super().__init__(f"[{source}] {message}")
