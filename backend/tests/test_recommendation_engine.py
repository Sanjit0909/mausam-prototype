from app.models.common import LocationInfo
from app.models.environment import AirQualityResponse
from app.models.weather import CurrentWeather, WeatherResponse
from app.services.recommendation_engine import compute_card_order, generate_insights, generate_recommendations


def make_weather(temperature=25.0, uv_index=3.0, wind_speed=10.0, condition_group="clear") -> WeatherResponse:
    return WeatherResponse(
        location=LocationInfo(name="Test City", lat=0.0, lon=0.0),
        current=CurrentWeather(
            temperature=temperature,
            feels_like=temperature,
            condition="Clear sky",
            condition_code=0,
            condition_group=condition_group,
            is_day=True,
            humidity=50.0,
            wind_speed=wind_speed,
            wind_direction=180.0,
            pressure=1013.0,
            precipitation=0,
            uv_index=uv_index,
            visibility=10.0,
            observed_at="2026-01-01T12:00",
        ),
    )


def test_card_order_prioritizes_aqi_and_uv_for_health_interest():
    order, reasons = compute_card_order(["health"])
    # health's own priority list is [aqi, uv_index, humidity, temperature, feels_like]
    assert order.index("aqi") < order.index("wind")
    assert order.index("uv_index") < order.index("pressure")
    assert "aqi" in reasons


def test_card_order_falls_back_to_default_when_no_interests(monkeypatch):
    import app.services.recommendation_engine as engine

    # Time-of-day now genuinely affects ranking (morning/evening boosts) - freeze to a
    # neutral midday hour so the *default* persona-only ordering is deterministic to test.
    class _FixedDatetime(engine.datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 1, 1, 7, 0, 0, tzinfo=tz)  # -> 12:30 IST, outside morning/evening windows

    monkeypatch.setattr(engine, "datetime", _FixedDatetime)

    order1, _ = compute_card_order([])
    order2, _ = compute_card_order([])
    assert order1 == order2  # deterministic
    assert order1[0] == "temperature"


def test_card_order_merges_multiple_interests():
    order, _ = compute_card_order(["marine_beach", "health"])
    # Cards from both interest lists should be present.
    assert "wave_height" in order
    assert "aqi" in order


def test_card_order_hides_marine_cards_when_location_has_no_coastal_data():
    order, _ = compute_card_order(["marine_beach"], marine_available=False)
    coastal_order, _ = compute_card_order(["marine_beach"], marine_available=True)
    # Without marine coverage, wave_height should rank far lower than with it.
    assert order.index("wave_height") > coastal_order.index("wave_height")


def test_card_order_boosts_aqi_when_severity_is_high():
    weather = make_weather()
    aqi = AirQualityResponse(location=LocationInfo(name="Test City", lat=0.0, lon=0.0), us_aqi=210, category="Very Unhealthy")
    order_no_interest, reasons = compute_card_order([], weather=weather, air_quality=aqi)
    assert order_no_interest.index("aqi") < order_no_interest.index("pressure")
    assert "unhealthy" in reasons["aqi"].lower()


def test_elderly_persona_prioritizes_temp_extremes_and_alerts():
    order, _ = compute_card_order(["elderly"])
    assert order.index("temp_extremes") < order.index("visibility")


def test_insight_flags_poor_air_quality_for_health_interest():
    weather = make_weather(uv_index=2.0)
    aqi = AirQualityResponse(
        location=LocationInfo(name="Test City", lat=0.0, lon=0.0), us_aqi=210, category="Very Unhealthy"
    )
    insights = generate_insights(weather, forecast=None, air_quality=aqi, interests=["health"])
    assert any("air quality" in i.message.lower() for i in insights)
    assert all(i.reason for i in insights)


def test_insight_flags_high_uv_when_no_aqi_data(monkeypatch):
    import app.services.recommendation_engine as engine

    # The UV insight is intentionally time-gated (no daytime UV warning at night) - freeze
    # "now" (UTC, since now_ist() adds +5:30) to a daytime IST hour so this test is
    # deterministic regardless of when/where it's run.
    class _FixedDatetime(engine.datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 1, 1, 4, 30, 0, tzinfo=tz)  # -> 10:00 IST

    monkeypatch.setattr(engine, "datetime", _FixedDatetime)

    weather = make_weather(uv_index=9.0)
    insights = generate_insights(weather, forecast=None, air_quality=None, interests=["outdoor_fitness"])
    assert any("uv" in i.message.lower() for i in insights)


def test_insights_never_empty():
    weather = make_weather(temperature=22, uv_index=1.0)
    insights = generate_insights(weather, forecast=None, air_quality=None, interests=[])
    assert len(insights) >= 1


def test_recommendations_generate_one_card_per_interest():
    weather = make_weather()
    cards = generate_recommendations(weather, forecast=None, interests=["outdoor_fitness", "travel", "health"])
    interests_seen = {c.interest for c in cards}
    assert interests_seen == {"outdoor_fitness", "travel", "health"}
    assert all(c.reason for c in cards)


def test_recommendations_empty_for_no_interests():
    weather = make_weather()
    cards = generate_recommendations(weather, forecast=None, interests=[])
    assert cards == []


def test_agriculture_recommendation_labeled_as_weather_based_not_official():
    weather = make_weather()
    cards = generate_recommendations(weather, forecast=None, interests=["agriculture"])
    agri_card = next(c for c in cards if c.interest == "agriculture")
    assert agri_card.label == "Weather-based recommendation"


def test_elderly_recommendation_flags_temperature_risk():
    weather = make_weather(temperature=39.0)
    cards = generate_recommendations(weather, forecast=None, interests=["elderly"])
    elderly_card = next(c for c in cards if c.interest == "elderly")
    assert "limiting outdoor time" in elderly_card.description.lower()
