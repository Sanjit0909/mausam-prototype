import asyncio

from fastapi import APIRouter

from ..models.ai import ChatRequest, ChatResponse
from ..services.ai_assistant import generate_reply
from ..services.air_quality import get_air_quality
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    # Fetch weather/forecast/AQI concurrently instead of one-by-one - roughly a 3x latency
    # cut for this endpoint, since each is an independent external API call.
    weather_result, forecast_result, air_quality_result = await asyncio.gather(
        get_current_weather(request.lat, request.lon, request.location_name),
        get_forecast(request.lat, request.lon, days=3, name=request.location_name),
        get_air_quality(request.lat, request.lon, request.location_name),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result  # weather is load-bearing; forecast/AQI degrade gracefully below

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result

    reply, source = await generate_reply(
        message=request.message,
        weather=weather_result,
        forecast=forecast,
        air_quality=air_quality,
        interests=request.interests,
        history=request.history,
    )
    return ChatResponse(reply=reply, source=source)
