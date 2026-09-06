"""Field-level weather validation, fallback, and provenance.

Providers are tried independently per field:
  IMD (official) → Open-Meteo (model) → OpenWeatherMap → Weatherstack → unavailable

Sentinel rules are provider-aware: pressure 0 is never valid; wind/precip/UV 0 can be.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from ..models.weather import CurrentWeather, FieldProvenance, WeatherResponse

SOURCE_IMD = "IMD"
SOURCE_OPEN_METEO = "Open-Meteo"
SOURCE_WEATHERSTACK = "Weatherstack"
SOURCE_OWM = "OpenWeatherMap"
SOURCE_UNAVAILABLE = "Unavailable"

CATEGORY_OFFICIAL = "Official"
CATEGORY_MODEL = "Model"
CATEGORY_WEATHERSTACK = "Weatherstack"
CATEGORY_DERIVED = "Derived"
CATEGORY_ESTIMATED = "Estimated"
CATEGORY_UNAVAILABLE = "Unavailable"

SOURCE_CATEGORY: dict[str, str] = {
    SOURCE_IMD: CATEGORY_OFFICIAL,
    SOURCE_OPEN_METEO: CATEGORY_MODEL,
    SOURCE_WEATHERSTACK: CATEGORY_WEATHERSTACK,
    SOURCE_OWM: CATEGORY_MODEL,
    SOURCE_UNAVAILABLE: CATEGORY_UNAVAILABLE,
}

NUMERIC_FIELDS = (
    "temperature",
    "feels_like",
    "humidity",
    "wind_speed",
    "wind_direction",
    "pressure",
    "precipitation",
    "uv_index",
    "visibility",
)


def category_for_source(source: str | None) -> str:
    if not source:
        return CATEGORY_UNAVAILABLE
    return SOURCE_CATEGORY.get(source, CATEGORY_MODEL)


def _finite(value: Any) -> float | None:
    if value is None:
        return None
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    if n != n or n in (float("inf"), float("-inf")):  # NaN / inf
        return None
    return n


def is_valid_temperature(value: Any, _provider: str) -> bool:
    n = _finite(value)
    return n is not None and -90.0 <= n <= 60.0


def is_valid_feels_like(value: Any, provider: str) -> bool:
    return is_valid_temperature(value, provider)


def is_valid_humidity(value: Any, _provider: str) -> bool:
    n = _finite(value)
    # 0% is physically extreme for surface air but some stations report it;
    # treat only missing/out-of-range as invalid — not a blind zero-null.
    return n is not None and 0.0 <= n <= 100.0


def is_valid_wind_speed(value: Any, _provider: str) -> bool:
    n = _finite(value)
    # Calm wind (0) is a legitimate observation when explicitly reported.
    return n is not None and 0.0 <= n <= 250.0


def is_valid_wind_direction(value: Any, _provider: str) -> bool:
    n = _finite(value)
    return n is not None and 0.0 <= n <= 360.0


def is_valid_pressure(value: Any, _provider: str) -> bool:
    n = _finite(value)
    # Pressure 0 hPa is a sentinel/missing — never a real MSL pressure.
    if n is None or n <= 0:
        return False
    return 870.0 <= n <= 1085.0


def is_valid_precipitation(value: Any, _provider: str) -> bool:
    n = _finite(value)
    # 0 mm is a legitimate dry observation.
    return n is not None and 0.0 <= n <= 500.0


def is_valid_uv_index(value: Any, _provider: str) -> bool:
    n = _finite(value)
    # UV 0 is valid at night / overcast.
    return n is not None and 0.0 <= n <= 20.0


def is_valid_visibility(value: Any, provider: str) -> bool:
    n = _finite(value)
    if n is None:
        return False
    # Weatherstack/Open-Meteo may report 0 for fog; accept non-negative km.
    # Negative or absurd values are rejected.
    if provider == SOURCE_IMD:
        # IMD does not currently map visibility — any value here is unexpected.
        return n > 0
    return 0.0 <= n <= 100.0


_VALIDATORS: dict[str, Callable[[Any, str], bool]] = {
    "temperature": is_valid_temperature,
    "feels_like": is_valid_feels_like,
    "humidity": is_valid_humidity,
    "wind_speed": is_valid_wind_speed,
    "wind_direction": is_valid_wind_direction,
    "pressure": is_valid_pressure,
    "precipitation": is_valid_precipitation,
    "uv_index": is_valid_uv_index,
    "visibility": is_valid_visibility,
}


def is_valid_field(field_name: str, value: Any, provider: str) -> bool:
    validator = _VALIDATORS.get(field_name)
    if validator is None:
        return value is not None
    return validator(value, provider)


@dataclass
class ProviderSnapshot:
    """One provider's attempt at current weather (may be partial / failed)."""

    provider: str
    response: WeatherResponse | None = None
    error: str | None = None

    @property
    def ok(self) -> bool:
        return self.response is not None


@dataclass
class MergedField:
    value: float | None
    source: str | None
    category: str


@dataclass
class MergeResult:
    values: dict[str, float | None] = field(default_factory=dict)
    provenance: dict[str, FieldProvenance] = field(default_factory=dict)


def pick_field(
    field_name: str,
    snapshots: list[ProviderSnapshot],
) -> MergedField:
    for snap in snapshots:
        if not snap.ok or snap.response is None:
            continue
        raw = getattr(snap.response.current, field_name, None)
        if is_valid_field(field_name, raw, snap.provider):
            return MergedField(
                value=float(raw),
                source=snap.provider,
                category=category_for_source(snap.provider),
            )
    return MergedField(value=None, source=None, category=CATEGORY_UNAVAILABLE)


def merge_current_fields(snapshots: list[ProviderSnapshot]) -> MergeResult:
    """Independently select each numeric field from the first valid provider."""
    result = MergeResult()
    for name in NUMERIC_FIELDS:
        picked = pick_field(name, snapshots)
        result.values[name] = picked.value
        result.provenance[name] = FieldProvenance(
            value=picked.value,
            source=picked.source,
            category=picked.category,
        )
    return result


def provider_label_for_merge(snapshots: list[ProviderSnapshot], provenance: dict[str, FieldProvenance]) -> tuple[str, str]:
    """Return (source_code, human label) reflecting mixed provenance when needed."""
    used = {p.source for p in provenance.values() if p.source}
    primary = next((s.provider for s in snapshots if s.ok), SOURCE_UNAVAILABLE)

    if not used:
        return "unavailable", "Unavailable"

    if used == {SOURCE_IMD}:
        return "imd", "IMD – Official Current Weather"
    if used == {SOURCE_OPEN_METEO}:
        return "open-meteo", "Open-Meteo – Model Current Weather"
    if used == {SOURCE_WEATHERSTACK}:
        return "weatherstack", "Weatherstack – Current Weather"
    if used == {SOURCE_OWM}:
        return "openweathermap", "OpenWeatherMap – Model Current Weather"

    # Mixed: prefer IMD as primary code when it contributed any field.
    if SOURCE_IMD in used:
        others = sorted(used - {SOURCE_IMD})
        label = "IMD (official) + " + " + ".join(others) + " (field fallback)"
        return "imd+fallback", label

    code = "+".join(sorted({s.lower().replace(" ", "-") for s in used}))
    label = " + ".join(sorted(used)) + " (field merge)"
    return code, label


def build_merged_weather_response(
    snapshots: list[ProviderSnapshot],
    *,
    lat: float,
    lon: float,
    name: str | None,
) -> WeatherResponse:
    """Build a WeatherResponse from provider snapshots with field-level fallback."""
    merge = merge_current_fields(snapshots)
    values = merge.values

    if values.get("temperature") is None:
        raise RuntimeError(
            "No valid temperature from IMD, Open-Meteo, OpenWeatherMap, or Weatherstack"
        )

    # Prefer metadata from the first successful snapshot (usually IMD).
    base = next((s.response for s in snapshots if s.ok and s.response is not None), None)
    if base is None:
        raise RuntimeError("No weather provider returned data")

    feels = values.get("feels_like")
    if feels is None:
        feels = values["temperature"]
        merge.provenance["feels_like"] = FieldProvenance(
            value=feels,
            source=merge.provenance["temperature"].source,
            category=CATEGORY_DERIVED,
        )

    current = CurrentWeather(
        temperature=values["temperature"],
        feels_like=feels,
        condition=base.current.condition,
        condition_code=base.current.condition_code,
        condition_group=base.current.condition_group,
        is_day=base.current.is_day,
        humidity=values.get("humidity"),
        wind_speed=values.get("wind_speed"),
        wind_direction=values.get("wind_direction"),
        pressure=values.get("pressure"),
        precipitation=values.get("precipitation"),
        uv_index=values.get("uv_index"),
        visibility=values.get("visibility"),
        observed_at=base.current.observed_at,
        field_sources={
            k: {"value": v.value, "source": v.source, "category": v.category}
            for k, v in merge.provenance.items()
        },
    )

    source_code, label = provider_label_for_merge(snapshots, merge.provenance)
    loc = base.location
    if name:
        loc = loc.model_copy(update={"name": name, "lat": lat, "lon": lon})

    return WeatherResponse(
        location=loc,
        current=current,
        source=source_code,
        is_demo=False,
        provider_label=label,
        observation_station=base.observation_station,
        observation_station_id=base.observation_station_id,
        station_distance_km=base.station_distance_km,
        field_sources=merge.provenance,
    )
