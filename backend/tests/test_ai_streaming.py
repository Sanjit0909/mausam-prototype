import pytest
from app.models.common import LocationInfo
from app.models.weather import CurrentWeather, WeatherResponse
from app.models.environment import AirQualityResponse
from app.services.ai_context import build_hyperlocal_json_context, build_ai_context
from app.services.ai_assistant import stream_reply, _system_instruction


def make_test_weather() -> WeatherResponse:
    return WeatherResponse(
        location=LocationInfo(name="New Delhi", lat=28.6139, lon=77.2090),
        current=CurrentWeather(
            temperature=31.0,
            feels_like=34.0,
            condition="Partly Cloudy",
            condition_code=2,
            condition_group="cloudy",
            is_day=True,
            humidity=62.0,
            wind_speed=14.0,
            wind_direction=315.0,
            pressure=1012.0,
            precipitation=0.0,
            uv_index=7.0,
            visibility=10.0,
            observed_at="2026-09-07T15:00",
        ),
    )


def test_hyperlocal_json_context_structure():
    weather = make_test_weather()
    aqi = AirQualityResponse(
        location=weather.location,
        us_aqi=182,
        category="Unhealthy",
        source="open-meteo",
    )
    ctx = build_hyperlocal_json_context(
        weather=weather,
        air_quality=aqi,
        interests=["fitness", "outdoor", "agriculture"],
    )

    assert "user" in ctx
    assert ctx["user"]["city"] == "New Delhi"
    assert ctx["user"]["coordinates"]["lat"] == 28.6139
    assert ctx["user"]["coordinates"]["lon"] == 77.2090
    assert "fitness" in ctx["user"]["interests"]

    assert "realtime_weather" in ctx
    rw = ctx["realtime_weather"]
    assert rw["temperature"] == "31°C"
    assert rw["apparent_temp"] == "34°C"
    assert rw["condition"] == "Partly Cloudy"
    assert rw["humidity"] == "62%"
    assert "14 km/h NW" in rw["wind"]
    assert rw["aqi"] == 182
    assert rw["uv_index"] == 7


def test_system_instruction_contains_production_directive():
    instruction = _system_instruction("test context", "en")
    assert "You are the MAUSAM Personalized Weather Copilot" in instruction
    assert "Always formulate responses in complete, polished, conversational sentences" in instruction
    assert "Never provide disconnected sentence fragments" in instruction


@pytest.mark.asyncio
async def test_stream_reply_yields_tokens_and_done():
    weather = make_test_weather()
    tokens = []
    done_seen = False
    source = None

    async for chunk in stream_reply(
        message="What is the weather like right now?",
        weather=weather,
        forecast=None,
        air_quality=None,
        interests=["outdoor"],
        history=[],
        locale="en",
    ):
        if not chunk["done"]:
            tokens.append(chunk["token"])
        else:
            done_seen = True
            source = chunk.get("source")

    assert done_seen is True
    assert len(tokens) > 0
    full_text = "".join(tokens)
    assert len(full_text.strip()) > 0
    assert source is not None
