import asyncio

from fastapi import APIRouter

from ..models.ai import ChatRequest, ChatResponse
from ..services.ai_assistant import generate_reply
from ..services.air_quality import get_air_quality
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Forecast/AQI enrich the answer but must not block the first token of a reply.
_CONTEXT_WAIT = 0.6


async def _optional(task: asyncio.Task):
    try:
        return await asyncio.wait_for(asyncio.shield(task), timeout=_CONTEXT_WAIT)
    except (TimeoutError, asyncio.CancelledError, Exception):
        return None


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    weather_task = asyncio.create_task(get_current_weather(request.lat, request.lon, request.location_name))
    forecast_task = asyncio.create_task(get_forecast(request.lat, request.lon, days=3, name=request.location_name))
    air_quality_task = asyncio.create_task(get_air_quality(request.lat, request.lon, request.location_name))

    weather = await weather_task
    forecast, air_quality = await asyncio.gather(_optional(forecast_task), _optional(air_quality_task))

    reply, source = await generate_reply(
        message=request.message,
        weather=weather,
        forecast=forecast,
        air_quality=air_quality,
        interests=request.interests,
        history=request.history,
        locale=request.locale or "en",
    )
    return ChatResponse(reply=reply, source=source)
