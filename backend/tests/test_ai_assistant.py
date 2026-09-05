import pytest

from app.models.common import LocationInfo
from app.models.weather import CurrentWeather, WeatherResponse
from app.services import ai_assistant


def make_weather(temperature=25.0) -> WeatherResponse:
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
            pressure=1013.0,
            precipitation=0,
            uv_index=3.0,
            visibility=10.0,
            observed_at="2026-01-01T12:00",
        ),
    )


async def _fail(*_args, **_kwargs):
    raise RuntimeError("provider down")


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

    reply, source = await ai_assistant.generate_reply(
        "Should I run?", make_weather(), None, None, ["fitness"], []
    )
    assert source == "deepseek"
    assert reply == "from deepseek"


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

    reply, source = await ai_assistant.generate_reply(
        "Will it rain?", make_weather(), None, None, [], []
    )
    assert source == "openrouter"
    assert reply == "from openrouter"


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

    reply, source = await ai_assistant.generate_reply(
        "Should I go for a run today?", make_weather(), None, None, [], []
    )
    assert source == "fallback"
    assert "Test City" in reply
    assert "run" in reply.lower()
