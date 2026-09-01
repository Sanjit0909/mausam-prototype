"""Shared async HTTP client for calling external weather/AI APIs."""
import httpx

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


class UpstreamAPIError(Exception):
    """Raised when an external weather/AI API fails or times out.

    Carries a short, user-safe message; the raw exception is logged server-side
    but never surfaced to the client (no stack traces reach the frontend).
    """

    def __init__(self, source: str, message: str = "Data temporarily unavailable"):
        self.source = source
        self.message = message
        super().__init__(f"[{source}] {message}")
