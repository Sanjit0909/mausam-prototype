"""Persona homepage engine — Runner ≠ Farmer ≠ Traveller for same weather."""

import pytest

from app.models.common import LocationInfo
from app.models.environment import AirQualityResponse
from app.models.persona import FarmerProfile, PersonaProfile
from app.models.weather import CurrentWeather, DailyPoint, ForecastResponse, HourlyPoint, WeatherResponse
from app.services import persona_engine
from app.services.agromet import fetch_official_agromet_advisory


def make_weather() -> WeatherResponse:
    return WeatherResponse(
        location=LocationInfo(name="Test City", lat=18.5, lon=73.8),
        current=CurrentWeather(
            temperature=34.0,
            feels_like=36.0,
            condition="Partly cloudy",
            condition_code=2,
            condition_group="cloudy",
            is_day=True,
            humidity=72.0,
            wind_speed=18.0,
            wind_direction=180.0,
            pressure=1008.0,
            precipitation=0.2,
            uv_index=8.0,
            visibility=6.0,
            observed_at="2026-09-06T06:00:00Z",
        ),
        source="imd",
        is_demo=False,
    )


def make_forecast() -> ForecastResponse:
    hourly = [
        HourlyPoint(
            time=f"2026-09-06T{h:02d}:00",
            temperature=30 + (h % 5),
            precipitation_probability=20 + h * 3,
            condition_code=61,
            condition_group="rain",
            wind_speed=12,
            uv_index=max(0, 10 - abs(h - 12)),
            visibility=5,
        )
        for h in range(6, 22)
    ]
    daily = [
        DailyPoint(
            date=f"2026-09-0{d}",
            temp_max=34,
            temp_min=24,
            precipitation_probability_max=55 if d % 2 else 20,
            condition_code=61,
            condition_group="rain",
        )
        for d in range(6, 11)
    ]
    return ForecastResponse(
        location=LocationInfo(name="Test City", lat=18.5, lon=73.8),
        hourly=hourly,
        daily=daily,
        source="open-meteo",
        is_demo=False,
    )


def make_aqi() -> AirQualityResponse:
    return AirQualityResponse(
        location=LocationInfo(name="Test City", lat=18.5, lon=73.8),
        us_aqi=120,
        category="Unhealthy for Sensitive Groups",
        pm2_5=45.0,
        source="open-meteo",
    )


def test_section_orders_are_distinct():
    farmer = persona_engine.PERSONA_SECTION_ORDER["farmer"]
    runner = persona_engine.PERSONA_SECTION_ORDER["runner"]
    traveller = persona_engine.PERSONA_SECTION_ORDER["traveller"]
    assert farmer != runner
    assert farmer != traveller
    assert runner != traveller
    assert "irrigation" in farmer and "crop_stage" in farmer
    assert "best_run_time" in runner
    assert "travel_risk" in traveller
    assert "irrigation" not in runner
    assert "best_run_time" not in traveller
    assert "crop_stage" not in traveller


def test_resolve_persona_from_interests():
    assert persona_engine.resolve_persona(["agriculture"]) == "farmer"
    assert persona_engine.resolve_persona(["outdoor_fitness"]) == "runner"
    assert persona_engine.resolve_persona(["travel"]) == "traveller"
    assert (
        persona_engine.resolve_persona(
            ["outdoor_fitness"], PersonaProfile(primary_persona="farmer")
        )
        == "farmer"
    )


@pytest.mark.asyncio
async def test_farmer_crop_stage_changes_content():
    weather = make_weather()
    forecast = make_forecast()
    wheat = await persona_engine.build_farmer_payload(
        weather, forecast, FarmerProfile(crop="wheat", crop_stage="flowering")
    )
    rice = await persona_engine.build_farmer_payload(
        weather, forecast, FarmerProfile(crop="rice", crop_stage="vegetative")
    )
    assert wheat.persona == "farmer" and rice.persona == "farmer"
    wheat_text = " ".join(c.summary + c.recommendation + c.reason for c in wheat.cards)
    rice_text = " ".join(c.summary + c.recommendation + c.reason for c in rice.cards)
    assert "Wheat" in wheat_text and "Flowering" in wheat_text
    assert "Rice" in rice_text and "Vegetative" in rice_text
    assert wheat_text != rice_text
    ids = {c.id for c in wheat.cards}
    assert "irrigation" in ids
    assert "soil_moisture" in ids
    assert "agromet_advisory" in ids
    soil = next(c for c in wheat.cards if c.id == "soil_moisture")
    assert soil.provenance == "estimated"
    assert "IMD" not in soil.source_label or "not IMD" in soil.source_label.lower() or "estimate" in soil.source_label.lower()
    agro = next(c for c in wheat.cards if c.id == "agromet_advisory")
    assert agro.provenance == "unavailable"
    assert agro.supporting_data.get("status") in {"unavailable", "not_configured"}


@pytest.mark.asyncio
async def test_runner_traveller_farmer_payloads_differ():
    weather = make_weather()
    forecast = make_forecast()
    aqi = make_aqi()
    farmer = await persona_engine.build_persona_home(
        weather, forecast, aqi, ["agriculture"], PersonaProfile(farmer=FarmerProfile(crop="cotton", crop_stage="sowing"))
    )
    runner = await persona_engine.build_persona_home(weather, forecast, aqi, ["outdoor_fitness"])
    traveller = await persona_engine.build_persona_home(weather, forecast, aqi, ["travel"])

    assert farmer.section_order != runner.section_order
    assert farmer.section_order != traveller.section_order
    assert runner.section_order != traveller.section_order

    farmer_ids = {c.id for c in farmer.cards}
    runner_ids = {c.id for c in runner.cards}
    travel_ids = {c.id for c in traveller.cards}

    assert "irrigation" in farmer_ids and "best_run_time" not in farmer_ids
    assert "best_run_time" in runner_ids and "irrigation" not in runner_ids
    assert "travel_risk" in travel_ids and "irrigation" not in travel_ids
    assert "packing" in travel_ids

    assert farmer.metric_priority[0] == "rain_probability"
    assert runner.metric_priority[0] == "aqi"
    assert traveller.metric_priority[0] == "visibility"

    assert any("Farmer" in c.reason for c in farmer.cards)
    assert any("Fitness" in c.reason for c in runner.cards)
    assert any("Traveller" in c.reason for c in traveller.cards)


@pytest.mark.asyncio
async def test_farmer_hindi_locale_natural_copy():
    weather = make_weather()
    forecast = make_forecast()
    hi = await persona_engine.build_farmer_payload(
        weather,
        forecast,
        FarmerProfile(crop="wheat", crop_stage="flowering"),
        locale="hi",
    )
    blob = " ".join(
        f"{c.title} {c.summary} {c.detail} {c.recommendation} {c.reason} {c.label} {c.source_label}"
        for c in hi.cards
    )
    assert "गेहूँ" in blob
    assert "फूल आने की अवस्था" in blob
    assert "Official IMD Meghdoot" not in blob
    assert "1 of next" not in blob
    assert "High rain chance" not in blob
    assert "For Wheat at" not in blob
    assert "may stress" not in blob
    agro = next(c for c in hi.cards if c.id == "agromet_advisory")
    assert "Meghdoot/KALP" in agro.detail or "KALP" in agro.detail
    assert "जुड़ा नहीं" in agro.detail or "उपलब्ध" in agro.summary


@pytest.mark.asyncio
async def test_agromet_never_fakes_official_advisory():
    status = await fetch_official_agromet_advisory(18.5, 73.8, FarmerProfile(crop="rice", crop_stage="vegetative"))
    assert status.available is False
    assert status.advisory_text is None
    assert "not" in status.message.lower() or "unavailable" in status.message.lower() or "not connected" in status.message.lower()


def test_metric_priorities_match_sih_brief():
    assert persona_engine.PERSONA_METRIC_PRIORITY["runner"][:4] == [
        "aqi",
        "uv_index",
        "humidity",
        "rain_probability",
    ]
    assert persona_engine.PERSONA_METRIC_PRIORITY["farmer"][0] == "rain_probability"
    assert "humidity" in persona_engine.PERSONA_METRIC_PRIORITY["farmer"][:3]
    assert persona_engine.PERSONA_METRIC_PRIORITY["traveller"][0] == "visibility"
