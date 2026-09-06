"""Tests for Open-Meteo Marine parsing and missing-field behaviour."""
from app.services.marine import parse_marine_hourly


def test_parse_marine_full_fields():
    hourly = {
        "wave_height": [1.2, 1.3],
        "wave_direction": [180, 190],
        "wave_period": [8.0, 8.5],
        "swell_wave_height": [0.9, None],
        "swell_wave_direction": [200, 210],
        "swell_wave_period": [10.0, 11.0],
        "ocean_current_velocity": [0.4, 0.5],
        "ocean_current_direction": [90, 95],
        "sea_surface_temperature": [28.5, 28.6],
        "sea_level_height_msl": [0.2, 0.3],
        "wind_wave_height": [0.5, 0.6],
        "wind_wave_direction": [170, 175],
        "wind_wave_period": [4.0, 4.2],
    }
    conditions, availability = parse_marine_hourly(hourly)
    assert conditions.wave_height == 1.2
    assert conditions.swell_wave_period == 10.0
    assert conditions.sea_surface_temperature == 28.5
    assert conditions.ocean_current_velocity == 0.4
    assert availability["wave_height"] is True
    assert availability["sea_surface_temperature"] is True


def test_parse_marine_missing_fields():
    hourly = {
        "wave_height": [None, None],
        "wave_direction": [],
        "swell_wave_height": [None],
    }
    conditions, availability = parse_marine_hourly(hourly)
    assert conditions.wave_height is None
    assert conditions.swell_wave_height is None
    assert conditions.sea_surface_temperature is None
    assert availability["wave_height"] is False
    assert availability["sea_surface_temperature"] is False


def test_parse_marine_skips_leading_nulls():
    hourly = {"wave_height": [None, None, 2.1], "wave_period": [None, 7.5]}
    conditions, _ = parse_marine_hourly(hourly)
    assert conditions.wave_height == 2.1
    assert conditions.wave_period == 7.5
