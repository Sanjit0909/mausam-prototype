import pytest

from app.models.common import LocationInfo
from app.models.environment import MarineConditions, MarineResponse
from app.models.persona import AgrometAdvisoryStatus, FarmerProfile, PersonaHomePayload, PersonaProfile
from app.models.weather import CurrentWeather, WeatherResponse
from app.services import ai_assistant
from app.services.ai_context import build_ai_context, classify_question_complexity


def make_weather(temperature=25.0, pressure=1013.0) -> WeatherResponse:
    return WeatherResponse(
        location=LocationInfo(name="Test City", lat=0.0, lon=0.0),
        current=CurrentWeather(
            temperature=temperature,
            feels_like=temperature,
            condition="Clear sky",
            condition_code=0,
            condition_group="clear",
            is_day=True,
            humidity=50.0,
            wind_speed=10.0,
            wind_direction=180.0,
            pressure=pressure,
            precipitation=0,
            uv_index=3.0,
            visibility=10.0,
            observed_at="2026-01-01T12:00",
        ),
    )


async def _fail(*_args, **_kwargs):
    raise RuntimeError("provider down")


def test_sanitize_strips_thinking_process_and_keeps_draft():
    raw = (
        "Here's a thinking process:\n"
        "Analyze User Input\n"
        "The user asks about rain.\n"
        "Check Weather Context\n"
        "Rain probability is high.\n"
        "Draft Response\n"
        "Yes. Rain is likely today in Greater Noida. Carry an umbrella."
    )
    cleaned = ai_assistant.sanitize_ai_reply(raw)
    assert "thinking process" not in cleaned.lower()
    assert "Analyze User Input" not in cleaned
    assert "Draft Response" not in cleaned
    assert "Yes. Rain is likely today in Greater Noida" in cleaned


def test_sanitize_leaves_clean_answer_alone():
    text = "Yes. Rain is likely today. Carry an umbrella this evening."
    assert ai_assistant.sanitize_ai_reply(text) == text


def test_classify_simple_vs_complex():
    assert classify_question_complexity("What is the temperature?") == "simple"
    assert classify_question_complexity("Should I irrigate my wheat today?") == "complex"
    assert classify_question_complexity("When is the best time to run?") == "complex"


def test_context_marks_unavailable_pressure():
    weather = make_weather()
    weather.current.pressure = None
    ctx = build_ai_context(weather=weather, interests=["agriculture"], locale="en")
    assert "Pressure: unavailable" in ctx
    assert "do not invent" in ctx.lower() or "Never invent" in ctx


def test_farmer_context_includes_agromet_unavailable():
    weather = make_weather()
    profile = PersonaProfile(primary_persona="farmer", farmer=FarmerProfile(crop="wheat", crop_stage="vegetative"))
    agromet = AgrometAdvisoryStatus(available=False, status="unavailable", portal_url="https://webgis.imd.gov.in/agro")
    ctx = build_ai_context(
        weather=weather,
        profile=profile,
        agromet=agromet,
        interests=["agriculture"],
        locale="hi",
    )
    assert "Farmer context" in ctx
    assert "wheat" in ctx
    assert "UNAVAILABLE" in ctx
    assert "estimated" in ctx.lower()


def test_marine_context_labels_model_not_incois():
    weather = make_weather()
    marine = MarineResponse(
        location=LocationInfo(name="Goa", lat=15.0, lon=74.0),
        available=True,
        current=MarineConditions(wave_height=1.2, wave_period=8.0, swell_wave_height=0.8),
        tides=[],
        wave_source="Open-Meteo Marine (model)",
        tide_source=None,
        incois_status="unavailable",
        source="open-meteo-marine",
    )
    ctx = build_ai_context(weather=weather, marine=marine, interests=["marine_beach"])
    assert "MODELLED" in ctx or "model" in ctx.lower()
    assert "INCOIS status: unavailable" in ctx
    assert "Tides: unavailable" in ctx
    assert "1.2" in ctx


def test_strip_reasoning_ignores_reasoning_only():
    class Msg:
        content = None
        reasoning_content = "secret chain of thought"

    assert ai_assistant._strip_reasoning_payload(Msg()) == ""


@pytest.mark.asyncio
async def test_chain_uses_deepseek_when_it_succeeds(monkeypatch):
    ai_assistant._provider_fail_until.clear()
    monkeypatch.setattr(ai_assistant.settings, "deepseek_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "gemini_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "openrouter_api_key", "k")
    ai_assistant._response_cache.clear()

    async def _ok(*_args, **_kwargs):
        return "from deepseek"

    monkeypatch.setattr(ai_assistant, "_call_deepseek", _ok)
    monkeypatch.setattr(ai_assistant, "_call_gemini", _fail)
    monkeypatch.setattr(ai_assistant, "_call_openrouter", _fail)

    reply, source, fallback_used, model = await ai_assistant.generate_reply(
        "Should I run?", make_weather(), None, None, ["fitness"], [], locale="en"
    )
    assert source == "deepseek"
    assert reply == "from deepseek"
    assert fallback_used is False


@pytest.mark.asyncio
async def test_chain_falls_to_gemini_then_openrouter(monkeypatch):
    ai_assistant._provider_fail_until.clear()
    monkeypatch.setattr(ai_assistant.settings, "deepseek_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "gemini_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "openrouter_api_key", "k")
    ai_assistant._response_cache.clear()

    async def _or_ok(*_args, **_kwargs):
        return "from openrouter"

    monkeypatch.setattr(ai_assistant, "_call_deepseek", _fail)
    monkeypatch.setattr(ai_assistant, "_call_gemini", _fail)
    monkeypatch.setattr(ai_assistant, "_call_openrouter", _or_ok)

    reply, source, fallback_used, model = await ai_assistant.generate_reply(
        "Will it rain?", make_weather(), None, None, [], [], locale="en"
    )
    assert source == "openrouter"
    assert reply == "from openrouter"
    assert fallback_used is True


@pytest.mark.asyncio
async def test_chain_falls_to_rule_engine_when_all_llms_fail(monkeypatch):
    ai_assistant._provider_fail_until.clear()
    monkeypatch.setattr(ai_assistant.settings, "deepseek_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "gemini_api_key", "k")
    monkeypatch.setattr(ai_assistant.settings, "openrouter_api_key", "k")
    ai_assistant._response_cache.clear()

    monkeypatch.setattr(ai_assistant, "_call_deepseek", _fail)
    monkeypatch.setattr(ai_assistant, "_call_gemini", _fail)
    monkeypatch.setattr(ai_assistant, "_call_openrouter", _fail)

    reply, source, fallback_used, model = await ai_assistant.generate_reply(
        "Should I go for a run today?", make_weather(), None, None, [], [], locale="en"
    )
    assert source == "fallback"
    assert fallback_used is True
    assert "Test City" in reply
    assert "run" in reply.lower()


@pytest.mark.asyncio
async def test_hindi_fallback_rain_reply(monkeypatch):
    ai_assistant._provider_fail_until.clear()
    monkeypatch.setattr(ai_assistant.settings, "deepseek_api_key", "")
    monkeypatch.setattr(ai_assistant.settings, "gemini_api_key", "")
    monkeypatch.setattr(ai_assistant.settings, "openrouter_api_key", "")
    ai_assistant._response_cache.clear()

    reply, source, fallback_used, model = await ai_assistant.generate_reply(
        "क्या आज बारिश होगी?", make_weather(), None, None, [], [], locale="hi"
    )
    assert source == "fallback"
    assert "बारिश" in reply or "Test City" in reply


@pytest.mark.asyncio
async def test_fallback_pressure_unavailable(monkeypatch):
    ai_assistant._provider_fail_until.clear()
    monkeypatch.setattr(ai_assistant.settings, "deepseek_api_key", "")
    monkeypatch.setattr(ai_assistant.settings, "gemini_api_key", "")
    monkeypatch.setattr(ai_assistant.settings, "openrouter_api_key", "")
    ai_assistant._response_cache.clear()
    weather = make_weather()
    weather.current.pressure = None
    reply, source, _, _ = await ai_assistant.generate_reply(
        "What is the pressure?", weather, None, None, [], [], locale="en"
    )
    assert source == "fallback"
    assert "unavailable" in reply.lower()
