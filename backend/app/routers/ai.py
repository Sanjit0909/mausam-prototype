import asyncio
import json

from fastapi import APIRouter

from ..models.ai import ChatRequest, ChatResponse
from ..models.persona import PersonaProfile
from ..services.ai_assistant import generate_reply
from ..services.air_quality import get_air_quality
from ..services.alerts_provider import get_official_alerts_bundle
from ..services.marine_provider import get_marine
from ..services.persona_engine import build_persona_home
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Enrichment must not block the first token of a reply for too long.
_CONTEXT_WAIT = 1.2


async def _optional(task: asyncio.Task):
    try:
        return await asyncio.wait_for(asyncio.shield(task), timeout=_CONTEXT_WAIT)
    except (TimeoutError, asyncio.CancelledError, Exception):
        return None


def _parse_profile(request: ChatRequest) -> PersonaProfile | None:
    profile: PersonaProfile | None = None
    if request.persona_profile_json:
        try:
            profile = PersonaProfile.model_validate(json.loads(request.persona_profile_json))
        except (json.JSONDecodeError, ValueError):
            profile = None
    if request.primary_persona:
        base = profile or PersonaProfile()
        profile = base.model_copy(update={"primary_persona": request.primary_persona.strip().lower()})
    return profile


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    weather_task = asyncio.create_task(get_current_weather(request.lat, request.lon, request.location_name))
    forecast_task = asyncio.create_task(get_forecast(request.lat, request.lon, days=3, name=request.location_name))
    air_quality_task = asyncio.create_task(get_air_quality(request.lat, request.lon, request.location_name))
    alerts_task = asyncio.create_task(get_official_alerts_bundle(request.lat, request.lon))
    marine_task = asyncio.create_task(get_marine(request.lat, request.lon, request.location_name))

    weather = await weather_task
    forecast, air_quality, alerts_bundle, marine = await asyncio.gather(
        _optional(forecast_task),
        _optional(air_quality_task),
        _optional(alerts_task),
        _optional(marine_task),
    )

    alerts = []
    if alerts_bundle is not None:
        alerts = getattr(alerts_bundle, "alerts", None) or []

    profile = _parse_profile(request)
    persona = None
    try:
        persona = await build_persona_home(
            weather,
            forecast,
            air_quality,
            request.interests,
            profile=profile,
        )
    except Exception:  # noqa: BLE001
        persona = None

    reply, source, fallback_used, model = await generate_reply(
        message=request.message,
        weather=weather,
        forecast=forecast,
        air_quality=air_quality,
        interests=request.interests,
        history=request.history,
        locale=request.locale or "en",
        alerts=alerts,
        marine=marine,
        persona=persona,
        profile=profile,
        agromet=persona.agromet if persona else None,
    )
    return ChatResponse(reply=reply, source=source, fallback_used=fallback_used, model=model)
