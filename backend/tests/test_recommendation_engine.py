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
    order = compute_card_order(["health"])
    # health's own priority list is [aqi, uv_index, humidity, temperature, feels_like]
    assert order.index("aqi") < order.index("wind")
    assert order.index("uv_index") < order.index("pressure")


def test_card_order_falls_back_to_default_when_no_interests():
    assert compute_card_order([]) == compute_card_order([])  # deterministic
    order = compute_card_order([])
    assert order[0] == "temperature"


def test_card_order_merges_multiple_interests():
    order = compute_card_order(["marine_beach", "health"])
    # Cards from both interest lists should be present.
    assert "wave_height" in order
    assert "aqi" in order


def test_insight_flags_poor_air_quality_for_health_interest():
    weather = make_weather(uv_index=2.0)
    aqi = AirQualityResponse(
        location=LocationInfo(name="Test City", lat=0.0, lon=0.0), us_aqi=210, category="Very Unhealthy"
    )
    insights = generate_insights(weather, forecast=None, air_quality=aqi, interests=["health"])
    assert any("air quality" in i.message.lower() for i in insights)


def test_insight_flags_high_uv_when_no_aqi_data(monkeypatch):
    import app.services.recommendation_engine as engine

    # The UV insight is intentionally time-gated (no daytime UV warning at night) - freeze
    # "now" to a daytime hour so this test is deterministic regardless of when it's run.
    class _FixedDatetime(engine.datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2026, 1, 1, 12, 0, 0)

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


def test_recommendations_empty_for_no_interests():
    weather = make_weather()
    cards = generate_recommendations(weather, forecast=None, interests=[])
    assert cards == []
