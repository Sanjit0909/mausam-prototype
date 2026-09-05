"""AI Weather Assistant chain:

    DeepSeek V4 Flash  ->  Gemini  ->  OpenRouter (openrouter/free)  ->  MAUSAM rule engine

Same weather context is built once and reused at every tier. The user never sees a raw
provider error (429/500/timeout/stack); a failure at any LLM tier silently degrades to
the next one, and the final rule-based tier always succeeds.
"""
import hashlib
import logging
import time

from ..config import settings
from ..models.ai import ChatMessage
from ..models.environment import AirQualityResponse
from ..models.weather import ForecastResponse, WeatherResponse

logger = logging.getLogger(__name__)

# Short-lived response cache: guards against double-submits / accidental duplicate requests
# firing two expensive AI calls for the same question a few seconds apart.
_RESPONSE_CACHE_TTL = 120
_response_cache: dict[str, tuple[float, tuple[str, str]]] = {}

# Keep per-provider waits short so a hung primary does not stall the chat UI.
_DEEPSEEK_TIMEOUT = 5.0
_GEMINI_TIMEOUT = 5.0
_OPENROUTER_TIMEOUT = 8.0
_PROVIDER_COOLDOWN = 45.0
_provider_fail_until: dict[str, float] = {}


def _provider_available(name: str) -> bool:
    return time.monotonic() >= _provider_fail_until.get(name, 0)


def _mark_provider_failure(name: str) -> None:
    _provider_fail_until[name] = time.monotonic() + _PROVIDER_COOLDOWN


def _cache_key(message: str, lat: float, lon: float, interests: list[str]) -> str:
    raw = f"{message.strip().lower()}|{lat:.2f}|{lon:.2f}|{','.join(sorted(interests))}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _build_context(
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
) -> str:
    current = weather.current
    lines = [
        f"Location: {weather.location.name}",
        f"Current: {current.condition}, {current.temperature:.0f}\u00b0C (feels like {current.feels_like:.0f}\u00b0C)",
        f"Humidity: {current.humidity:.0f}%, Wind: {current.wind_speed:.0f} km/h, Pressure: {current.pressure:.0f} hPa",
    ]
    if current.uv_index is not None:
        lines.append(f"UV index: {current.uv_index:.0f}")
    if air_quality is not None and air_quality.us_aqi is not None:
        lines.append(f"Air quality: {air_quality.category} (US AQI {air_quality.us_aqi})")

    if forecast is not None and forecast.hourly:
        # Hourly detail is what makes time-specific questions ("will it rain tonight?",
        # "should I go now?") accurate - daily min/max alone is too coarse for those.
        hourly_lines = [
            f"  {h.time[11:16]}: {h.temperature:.0f}\u00b0C, {h.condition_group}, "
            f"{(h.precipitation_probability or 0):.0f}% rain"
            for h in forecast.hourly[:12]
        ]
        lines.append("Next 12 hours (hourly):\n" + "\n".join(hourly_lines))

    if forecast is not None and forecast.daily:
        forecast_lines = [
            f"  {d.date}: {d.temp_min:.0f}-{d.temp_max:.0f}\u00b0C, {d.condition_group}, "
            f"{(d.precipitation_probability_max or 0):.0f}% rain chance"
            for d in forecast.daily[:3]
        ]
        lines.append("Next 3 days (daily):\n" + "\n".join(forecast_lines))

    if interests:
        lines.append(f"User's interests: {', '.join(interests)}")
    return "\n".join(lines)


def _system_instruction(context: str, interests: list[str]) -> str:
    return (
        "You are MAUSAM's AI weather assistant. Answer using ONLY the real weather context "
        "below - never invent numbers that contradict it. Be concise (2-4 sentences), "
        "practical, and specific. Tailor advice to the user's stated interests when relevant.\n\n"
        f"Weather context:\n{context}"
    )


def _chat_messages(message: str, context: str, interests: list[str], history: list[ChatMessage]) -> list[dict]:
    messages = [{"role": "system", "content": _system_instruction(context, interests)}]
    for turn in history[-6:]:
        role = "user" if turn.role == "user" else "assistant"
        messages.append({"role": role, "content": turn.content})
    messages.append({"role": "user", "content": message})
    return messages


async def _call_openai_compatible(
    *,
    api_key: str,
    base_url: str,
    model: str,
    message: str,
    context: str,
    interests: list[str],
    history: list[ChatMessage],
    provider_name: str,
    timeout: float,
    extra_headers: dict[str, str] | None = None,
) -> str:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=timeout,
        default_headers=extra_headers or None,
    )
    response = await client.chat.completions.create(
        model=model,
        messages=_chat_messages(message, context, interests, history),
        max_tokens=400,
        temperature=0.4,
    )
    text = response.choices[0].message.content if response.choices else None
    if not text:
        raise ValueError(f"Empty response from {provider_name}")
    routed = getattr(response, "model", None)
    if routed and routed != model:
        logger.info("[AI] %s routed model=%s", provider_name, routed)
    return text.strip()


async def _call_deepseek(message: str, context: str, interests: list[str], history: list[ChatMessage]) -> str:
    return await _call_openai_compatible(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        model=settings.deepseek_model,
        message=message,
        context=context,
        interests=interests,
        history=history,
        provider_name="DeepSeek",
        timeout=_DEEPSEEK_TIMEOUT,
    )


async def _call_openrouter(message: str, context: str, interests: list[str], history: list[ChatMessage]) -> str:
    # openrouter/free auto-selects an available free model when paid/primary keys fail.
    return await _call_openai_compatible(
        api_key=settings.openrouter_api_key,
        base_url=settings.openrouter_base_url,
        model=settings.openrouter_model,
        message=message,
        context=context,
        interests=interests,
        history=history,
        provider_name="OpenRouter",
        timeout=_OPENROUTER_TIMEOUT,
        extra_headers={
            "HTTP-Referer": "https://mausam-prototype.vercel.app",
            "X-Title": "MAUSAM",
        },
    )


async def _call_gemini(message: str, context: str, history: list[ChatMessage]) -> str:
    import asyncio

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)

    contents = []
    for turn in history[-6:]:
        role = "user" if turn.role == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=turn.content)]))
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    async def _generate() -> str:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=_system_instruction(context, []),
                max_output_tokens=400,
                thinking_config=types.ThinkingConfig(thinking_level="low"),
            ),
        )
        text = getattr(response, "text", None)
        if not text:
            raise ValueError("Empty response from Gemini")
        return text.strip()

    return await asyncio.wait_for(_generate(), timeout=_GEMINI_TIMEOUT)


def _fallback_reply(
    message: str,
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
) -> str:
    """Keyword-driven template assistant using the same real weather context - keeps the
    feature fully functional with no AI key configured or if every LLM tier fails."""
    current = weather.current
    lower = message.lower()
    location = weather.location.name
    rain_soon = bool(forecast and forecast.hourly and any((h.precipitation_probability or 0) >= 50 for h in forecast.hourly[:6]))

    if any(k in lower for k in ["run", "jog", "exercise", "workout"]):
        if current.uv_index and current.uv_index >= 7:
            return (
                f"It's {current.temperature:.0f}\u00b0C in {location} with a high UV index of {current.uv_index:.0f}. "
                "Better to run early morning or after sunset today, and wear sunscreen if you go during the day."
            )
        if rain_soon:
            return f"Rain is likely in {location} in the next few hours — consider an indoor workout or go soon before it arrives."
        return f"Conditions look good for a run in {location} right now: {current.temperature:.0f}\u00b0C, {current.condition.lower()}."

    if any(k in lower for k in ["rain", "umbrella", "wet"]):
        if rain_soon:
            return f"Yes, there's a good chance of rain in {location} in the next few hours — carry an umbrella."
        return f"Rain looks unlikely in {location} for the next few hours based on the current forecast."

    if any(k in lower for k in ["travel", "trip", "pack", "carry", "visit"]):
        items = []
        if rain_soon or current.condition_group in ("rain", "drizzle", "storm"):
            items.append("an umbrella or raincoat")
        if current.temperature >= 30:
            items.append("light, breathable clothing and sunscreen")
        if current.temperature <= 15:
            items.append("a warm jacket")
        if air_quality and air_quality.us_aqi and air_quality.us_aqi > 150:
            items.append("a mask for poor air quality")
        packing = ", ".join(items) if items else "no special weather gear — conditions look mild"
        return f"For {location}: {current.temperature:.0f}\u00b0C and {current.condition.lower()}. Consider packing {packing}."

    if any(k in lower for k in ["safe", "outside", "go out"]):
        aqi_note = f" Air quality is {air_quality.category.lower()}." if air_quality and air_quality.us_aqi else ""
        heat_note = " It's quite hot — stay hydrated." if current.temperature >= 35 else ""
        return f"Right now in {location}: {current.temperature:.0f}\u00b0C, {current.condition.lower()}.{aqi_note}{heat_note} " + (
            "Generally fine to go outside with normal precautions." if not (air_quality and (air_quality.us_aqi or 0) > 150) else "Consider limiting time outdoors."
        )

    if any(k in lower for k in ["event", "party", "wedding", "gathering", "outdoor plan"]):
        comfortable = 18 <= current.feels_like <= 30 and current.condition_group in ("clear", "cloudy")
        if comfortable and not rain_soon:
            return f"Conditions in {location} look favorable for an outdoor event — feels like {current.feels_like:.0f}\u00b0C with {current.condition.lower()} skies."
        return (
            f"It might be a bit challenging: feels like {current.feels_like:.0f}\u00b0C, {current.condition.lower()}"
            f"{', with rain possible' if rain_soon else ''}. Consider a backup indoor plan."
        )

    return (
        f"Right now in {location}: {current.condition}, {current.temperature:.0f}\u00b0C "
        f"(feels like {current.feels_like:.0f}\u00b0C), humidity {current.humidity:.0f}%, "
        f"wind {current.wind_speed:.0f} km/h. Ask me about running, rain, travel packing, or events for tailored advice."
    )


async def generate_reply(
    message: str,
    weather: WeatherResponse,
    forecast: ForecastResponse | None,
    air_quality: AirQualityResponse | None,
    interests: list[str],
    history: list[ChatMessage],
) -> tuple[str, str]:
    """Returns (reply, source) where source is 'deepseek' | 'gemini' | 'openrouter' | 'fallback'."""
    cache_key = _cache_key(message, weather.location.lat, weather.location.lon, interests)
    cached = _response_cache.get(cache_key)
    if cached and time.monotonic() - cached[0] < _RESPONSE_CACHE_TTL:
        logger.info("[AI] Duplicate request within %ds - serving cached reply", _RESPONSE_CACHE_TTL)
        return cached[1]

    context = _build_context(weather, forecast, air_quality, interests)

    if settings.has_deepseek_key and _provider_available("deepseek"):
        started = time.monotonic()
        try:
            reply = await _call_deepseek(message, context, interests, history)
            logger.info("[AI] DeepSeek success %.1fs", time.monotonic() - started)
            result = (reply, "deepseek")
            _response_cache[cache_key] = (time.monotonic(), result)
            return result
        except Exception as exc:  # noqa: BLE001 - any DeepSeek failure silently degrades
            _mark_provider_failure("deepseek")
            logger.warning("[AI] DeepSeek failed (%.1fs) - falling back to Gemini: %s", time.monotonic() - started, repr(exc))

    if settings.has_gemini_key and _provider_available("gemini"):
        started = time.monotonic()
        try:
            reply = await _call_gemini(message, context, history)
            logger.info("[AI] Gemini success %.1fs", time.monotonic() - started)
            result = (reply, "gemini")
            _response_cache[cache_key] = (time.monotonic(), result)
            return result
        except Exception as exc:  # noqa: BLE001 - any Gemini failure silently degrades
            _mark_provider_failure("gemini")
            logger.warning("[AI] Gemini failed (%.1fs) - falling back to OpenRouter: %s", time.monotonic() - started, repr(exc))

    if settings.has_openrouter_key and _provider_available("openrouter"):
        started = time.monotonic()
        try:
            reply = await _call_openrouter(message, context, interests, history)
            logger.info("[AI] OpenRouter success %.1fs", time.monotonic() - started)
            result = (reply, "openrouter")
            _response_cache[cache_key] = (time.monotonic(), result)
            return result
        except Exception as exc:  # noqa: BLE001 - any OpenRouter failure silently degrades
            _mark_provider_failure("openrouter")
            logger.warning("[AI] OpenRouter failed (%.1fs) - falling back to rule engine: %s", time.monotonic() - started, repr(exc))

    reply = _fallback_reply(message, weather, forecast, air_quality)
    result = (reply, "fallback")
    _response_cache[cache_key] = (time.monotonic(), result)
    return result
