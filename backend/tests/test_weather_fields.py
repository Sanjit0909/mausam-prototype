"""Tests for field-level weather fallback, sentinel validation, and provenance.

Chain under test (per field independently):
  IMD → Open-Meteo → OpenWeatherMap → Weatherstack → unavailable
"""
from __future__ import annotations

from app.models.common import LocationInfo
from app.models.weather import CurrentWeather, WeatherResponse
from app.services import weather_fields as wf


def _wx(
    *,
    temperature=28.0,
    feels_like=29.0,
    humidity=60.0,
    wind_speed=12.0,
    wind_direction=180.0,
    pressure=1008.0,
    precipitation=0.0,
    uv_index=5.0,
    visibility=7.0,
    source="test",
) -> WeatherResponse:
    return WeatherResponse(
        location=LocationInfo(name="Test", lat=28.6, lon=77.2),
        current=CurrentWeather(
            temperature=temperature,
            feels_like=feels_like,
            condition="Clear sky",
            condition_code=0,
            condition_group="clear",
            is_day=True,
            humidity=humidity,
            wind_speed=wind_speed,
            wind_direction=wind_direction,
            pressure=pressure,
            precipitation=precipitation,
            uv_index=uv_index,
            visibility=visibility,
            observed_at="2026-09-06T06:00:00Z",
        ),
        source=source,
    )


def _chain(imd=None, om=None, owm=None, ws=None):
    snaps = []
    if imd is not None:
        snaps.append(wf.ProviderSnapshot(provider=wf.SOURCE_IMD, response=imd))
    if om is not None:
        snaps.append(wf.ProviderSnapshot(provider=wf.SOURCE_OPEN_METEO, response=om))
    if owm is not None:
        snaps.append(wf.ProviderSnapshot(provider=wf.SOURCE_OWM, response=owm))
    if ws is not None:
        snaps.append(wf.ProviderSnapshot(provider=wf.SOURCE_WEATHERSTACK, response=ws))
    return snaps


def test_imd_valid_selected():
    merged = wf.build_merged_weather_response(
        _chain(imd=_wx(temperature=30.0, pressure=1012.0, humidity=55.0), om=_wx(temperature=31.0)),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.temperature == 30.0
    assert merged.field_sources["temperature"].source == wf.SOURCE_IMD
    assert merged.field_sources["pressure"].source == wf.SOURCE_IMD
    assert merged.field_sources["humidity"].category == wf.CATEGORY_OFFICIAL


def test_imd_missing_open_meteo_selected():
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(pressure=None, visibility=None, uv_index=None),
            om=_wx(pressure=1008.0, visibility=8.0, uv_index=4.0),
            owm=_wx(pressure=999.0, visibility=1.0, uv_index=9.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.pressure == 1008.0
    assert merged.field_sources["pressure"].source == wf.SOURCE_OPEN_METEO
    assert merged.field_sources["visibility"].source == wf.SOURCE_OPEN_METEO
    assert merged.field_sources["uv_index"].source == wf.SOURCE_OPEN_METEO
    assert merged.field_sources["temperature"].source == wf.SOURCE_IMD


def test_imd_and_om_missing_openweathermap_selected():
    """OpenWeatherMap is the third rung — used when IMD and Open-Meteo lack the field."""
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(pressure=None, visibility=None),
            om=_wx(pressure=None, visibility=None),
            owm=_wx(pressure=1011.0, visibility=4.5),
            ws=_wx(pressure=1000.0, visibility=9.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Pune",
    )
    assert merged.current.pressure == 1011.0
    assert merged.field_sources["pressure"].source == wf.SOURCE_OWM
    assert merged.field_sources["pressure"].category == wf.CATEGORY_MODEL
    assert merged.current.visibility == 4.5
    assert merged.field_sources["visibility"].source == wf.SOURCE_OWM
    # Weatherstack must not win when OWM already provided a valid value
    assert merged.field_sources["visibility"].source != wf.SOURCE_WEATHERSTACK


def test_imd_om_owm_missing_weatherstack_selected():
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(visibility=None, uv_index=None, pressure=None),
            om=_wx(visibility=None, uv_index=None, pressure=None),
            owm=_wx(visibility=None, uv_index=None, pressure=None),
            ws=_wx(visibility=6.0, uv_index=3.0, pressure=1010.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Mumbai",
    )
    assert merged.current.visibility == 6.0
    assert merged.field_sources["visibility"].source == wf.SOURCE_WEATHERSTACK
    assert merged.field_sources["uv_index"].source == wf.SOURCE_WEATHERSTACK
    assert merged.field_sources["pressure"].source == wf.SOURCE_WEATHERSTACK
    assert merged.field_sources["visibility"].category == wf.CATEGORY_WEATHERSTACK


def test_all_four_missing_returns_null():
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(visibility=None, uv_index=None),
            om=_wx(visibility=None, uv_index=None),
            owm=_wx(visibility=None, uv_index=None),
            ws=_wx(visibility=None, uv_index=None),
        ),
        lat=28.6,
        lon=77.2,
        name="Pune",
    )
    assert merged.current.visibility is None
    assert merged.current.uv_index is None
    assert merged.field_sources["visibility"].category == wf.CATEGORY_UNAVAILABLE
    assert merged.field_sources["uv_index"].source is None


def test_mixed_fields_across_full_chain():
    """Classic field-level example: IMD temp, OM wind, OWM pressure, WS visibility."""
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(temperature=29.0, wind_speed=None, pressure=None, visibility=None, uv_index=None),
            om=_wx(temperature=99.0, wind_speed=14.0, pressure=None, visibility=None, uv_index=None),
            owm=_wx(temperature=88.0, wind_speed=40.0, pressure=1006.0, visibility=None, uv_index=None),
            ws=_wx(temperature=77.0, wind_speed=50.0, pressure=990.0, visibility=5.5, uv_index=1.0),
        ),
        lat=19.0,
        lon=72.8,
        name="Mumbai",
    )
    assert merged.current.temperature == 29.0
    assert merged.field_sources["temperature"].source == wf.SOURCE_IMD
    assert merged.current.wind_speed == 14.0
    assert merged.field_sources["wind_speed"].source == wf.SOURCE_OPEN_METEO
    assert merged.current.pressure == 1006.0
    assert merged.field_sources["pressure"].source == wf.SOURCE_OWM
    assert merged.current.visibility == 5.5
    assert merged.field_sources["visibility"].source == wf.SOURCE_WEATHERSTACK
    assert merged.current.uv_index == 1.0
    assert merged.field_sources["uv_index"].source == wf.SOURCE_WEATHERSTACK
    # Must not claim pure IMD when fields mixed
    assert merged.source == "imd+fallback"
    assert "Open-Meteo" in (merged.provider_label or "")
    assert "OpenWeatherMap" in (merged.provider_label or "")


def test_wind_zero_remains_valid():
    assert wf.is_valid_wind_speed(0.0, wf.SOURCE_IMD)
    merged = wf.build_merged_weather_response(
        _chain(imd=_wx(wind_speed=0.0), om=_wx(wind_speed=15.0)),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.wind_speed == 0.0
    assert merged.field_sources["wind_speed"].source == wf.SOURCE_IMD


def test_pressure_zero_rejected_falls_to_open_meteo_then_owm():
    assert not wf.is_valid_pressure(0.0, wf.SOURCE_IMD)
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(pressure=0.0),
            om=_wx(pressure=None),
            owm=_wx(pressure=1005.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.pressure == 1005.0
    assert merged.field_sources["pressure"].source == wf.SOURCE_OWM


def test_precipitation_zero_valid():
    assert wf.is_valid_precipitation(0.0, wf.SOURCE_IMD)
    merged = wf.build_merged_weather_response(
        _chain(imd=_wx(precipitation=0.0), om=_wx(precipitation=2.0)),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.precipitation == 0.0
    assert merged.field_sources["precipitation"].source == wf.SOURCE_IMD


def test_uv_zero_valid():
    assert wf.is_valid_uv_index(0.0, wf.SOURCE_OPEN_METEO)
    merged = wf.build_merged_weather_response(
        _chain(imd=_wx(uv_index=None), om=_wx(uv_index=0.0)),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.uv_index == 0.0
    assert merged.field_sources["uv_index"].source == wf.SOURCE_OPEN_METEO


def test_field_level_does_not_replace_valid_imd():
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(temperature=27.0, humidity=40.0, wind_speed=5.0, pressure=1015.0),
            om=_wx(temperature=99.0, humidity=99.0, wind_speed=99.0, pressure=999.0),
            owm=_wx(temperature=88.0, humidity=88.0, wind_speed=88.0, pressure=888.0),
            ws=_wx(temperature=77.0, humidity=77.0, wind_speed=77.0, pressure=777.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Delhi",
    )
    assert merged.current.temperature == 27.0
    assert merged.current.humidity == 40.0
    assert merged.current.wind_speed == 5.0
    assert merged.current.pressure == 1015.0
    for key in ("temperature", "humidity", "wind_speed", "pressure"):
        assert merged.field_sources[key].source == wf.SOURCE_IMD
    assert merged.source == "imd"


def test_mixed_provenance_never_claims_pure_imd_for_model_fields():
    merged = wf.build_merged_weather_response(
        _chain(
            imd=_wx(pressure=None, uv_index=None, visibility=None),
            om=_wx(pressure=1008.0, uv_index=2.0, visibility=None),
            owm=_wx(visibility=None),
            ws=_wx(visibility=5.0),
        ),
        lat=28.6,
        lon=77.2,
        name="Chennai",
    )
    assert merged.source == "imd+fallback"
    assert merged.field_sources["temperature"].category == wf.CATEGORY_OFFICIAL
    assert merged.field_sources["pressure"].category == wf.CATEGORY_MODEL
    assert merged.field_sources["pressure"].source == wf.SOURCE_OPEN_METEO
    assert merged.field_sources["visibility"].category == wf.CATEGORY_WEATHERSTACK
