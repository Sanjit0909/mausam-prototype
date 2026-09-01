from app.models.common import LocationInfo
from app.models.weather import CurrentWeather, WeatherResponse
from app.services.alerts_engine import generate_derived_alerts


def make_weather(**overrides) -> WeatherResponse:
    defaults = dict(
        temperature=25.0,
        feels_like=25.0,
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
    )
    defaults.update(overrides)
    return WeatherResponse(location=LocationInfo(name="Test City", lat=0.0, lon=0.0), current=CurrentWeather(**defaults))


def test_no_alerts_for_mild_conditions():
    weather = make_weather()
    assert generate_derived_alerts(weather) == []


def test_extreme_heat_alert_triggers_above_40():
    weather = make_weather(temperature=42.0, feels_like=45.0)
    alerts = generate_derived_alerts(weather)
    assert any(a.id == "heat-extreme" and a.severity == "severe" for a in alerts)


def test_cold_alert_triggers_at_low_temperature():
    weather = make_weather(temperature=2.0, feels_like=0.0)
    alerts = generate_derived_alerts(weather)
    assert any(a.id == "cold-advisory" for a in alerts)


def test_high_wind_alert_triggers_above_50kmh():
    weather = make_weather(wind_speed=60.0)
    alerts = generate_derived_alerts(weather)
    assert any(a.id == "wind-high" and a.severity == "severe" for a in alerts)


def test_storm_condition_triggers_storm_alert():
    weather = make_weather(condition_group="storm", condition_code=95)
    alerts = generate_derived_alerts(weather)
    assert any(a.id == "storm-active" for a in alerts)


def test_all_derived_alerts_are_labeled_derived_not_official():
    weather = make_weather(temperature=41.0, wind_speed=60.0, condition_group="storm")
    alerts = generate_derived_alerts(weather)
    assert len(alerts) > 0
    assert all(a.source == "derived" for a in alerts)
