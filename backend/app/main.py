"""MAUSAM backend - FastAPI weather aggregation, personalization, and AI assistant API."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings, settings
from .core.http_client import UpstreamAPIError, close_http_client
from .routers import air_quality, ai, alerts, astronomy, forecast, historical, home, insights, location, marine, weather

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mausam")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_http_client()


app = FastAPI(title="MAUSAM API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(UpstreamAPIError)
async def upstream_error_handler(_: Request, exc: UpstreamAPIError) -> JSONResponse:
    # exc_info surfaces the original underlying exception (e.g. the exact httpx
    # connect/timeout/SSL error) in server logs - critical for diagnosing hosting-specific
    # network issues that never reproduce locally.
    logger.warning("Upstream API error from %s: %s", exc.source, exc, exc_info=exc.__cause__)
    return JSONResponse(status_code=503, content={"error": True, "message": exc.message, "source": exc.source})


@app.exception_handler(Exception)
async def generic_error_handler(_: Request, exc: Exception) -> JSONResponse:
    # Never leak raw stack traces / internals to the client - log server-side only.
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": True, "message": "Something went wrong. Please try again.", "source": None})


@app.get("/health")
async def health() -> dict:
    # Fresh read so /health reflects the current .env, not the import-time singleton.
    current = get_settings()
    ai_chain: list[str] = []
    if current.has_deepseek_key:
        ai_chain.append("deepseek")
    if current.has_gemini_key:
        ai_chain.append("gemini")
    if current.has_openrouter_key:
        ai_chain.append("openrouter")
    ai_chain.append("rule-based")
    ai_mode = ai_chain[0]
    return {
        "status": "ok",
        "env": current.env,
        "ai_mode": ai_mode,
        "providers": {
            "ai": {
                "active_primary": ai_mode,
                "chain": ai_chain,
                "deepseek_configured": current.has_deepseek_key,
                "gemini_configured": current.has_gemini_key,
                "openrouter_configured": current.has_openrouter_key,
            },
            "weather": {
                "chain": ["imd", "open-meteo", "openweathermap", "weatherstack"],
                "imd_configured": current.has_imd_key,
                "openweathermap_configured": current.has_owm_key,
                "weatherstack_configured": current.has_weatherstack_key,
            },
            "marine": {
                "chain": ["incois", "open-meteo-marine", "stormglass-tides-only"],
                "incois_configured": current.has_incois_key,
                "stormglass_configured": current.has_stormglass_key,
            },
            "alerts": {
                "chain": ["imd", "nws-us-only", "derived"],
                "imd_configured": current.has_imd_key,
            },
        },
    }


app.include_router(home.router)
app.include_router(weather.router)
app.include_router(forecast.router)
app.include_router(air_quality.router)
app.include_router(location.router)
app.include_router(alerts.router)
app.include_router(marine.router)
app.include_router(astronomy.router)
app.include_router(historical.router)
app.include_router(insights.router)
app.include_router(ai.router)
