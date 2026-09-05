"""IMD district-wise warnings and nowcast.

District IDs (Obj_id) come ONLY from official IMD list endpoints — never invented.

Mapping approach:
1. Load official district catalog via GET /districtwarning (no id) — rows include Obj_id + District.
   Fallback catalog source: GET /districtrainfall (OBJ_ID + District) if warning list is empty.
2. Reverse-geocode lat/lon to a district name (BigDataCloud via geocoding.resolve_india_district).
3. Match normalized names against the IMD catalog (optional state disambiguation).
4. Fetch /districtwarning?id=<Obj_id> and /districtnowcast?id=<Obj_id> with existing JWT auth.

Distinguishes:
- not_configured / unavailable / unmapped_district / ok_no_active / ok
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from ..core.cache import TTLCache
from ..core.http_client import UpstreamAPIError
from ..models.alerts import WeatherAlert
from . import geocoding
from .imd import _as_list, _imd_get, _pick, is_configured

logger = logging.getLogger(__name__)

_catalog_cache = TTLCache(ttl_seconds=6 * 60 * 60)
_district_obs_cache = TTLCache(ttl_seconds=10 * 60)

# Official districtwarning Day color codes (docs): 1=Red, 2=Orange, 3=Yellow, 4=Green
_WARNING_COLOR_SEVERITY = {
    "1": "extreme",
    "2": "severe",
    "3": "moderate",
    "4": "minor",
}

# Official districtnowcast color codes (docs): 1=Green, 2=Yellow, 3=Orange, 4=Red
_NOWCAST_COLOR_SEVERITY = {
    "1": "minor",
    "2": "moderate",
    "3": "severe",
    "4": "extreme",
}

_WARNING_CODE_LABELS = {
    "1": "No Warning",
    "2": "Heavy Rain",
    "3": "Heavy Snow",
    "4": "Thunderstorm & Lightning, Squall etc",
    "5": "Hailstorm",
    "6": "Dust Storm",
    "7": "Dust Raising Winds",
    "8": "Strong Surface Winds",
    "9": "Heat Wave",
    "10": "Hot Day",
    "11": "Warm Night",
    "12": "Cold Wave",
    "13": "Cold Day",
    "14": "Ground Frost",
    "15": "Fog",
    "16": "Very Heavy Rain",
    "17": "Extremely Heavy Rain",
}

_WARNING_CODE_TYPE = {
    "2": "rain",
    "3": "cold",
    "4": "storm",
    "5": "storm",
    "6": "wind",
    "7": "wind",
    "8": "wind",
    "9": "heat",
    "10": "heat",
    "11": "heat",
    "12": "cold",
    "13": "cold",
    "14": "cold",
    "15": "fog",
    "16": "rain",
    "17": "rain",
}

_NOWCAST_CAT_LABELS = {
    "1": "No Weather",
    "2": "Light rain: < 5 mm/hr",
    "3": "Light snow: < 5 cm/hr",
    "4": "Light Thunderstorms (gusts < 40 kmph)",
    "5": "Slight dust storm",
    "6": "Low CG Lightning probability (< 30%)",
    "7": "Moderate rain: 5-15 mm/hr",
    "8": "Moderate snow: 5-15 cm/hr",
    "9": "Moderate Thunderstorms (gusts 41-61 kmph)",
    "10": "Moderate dust storm",
    "11": "Moderate CG Lightning probability (30-60%)",
    "12": "Heavy rain: > 15 mm/hr",
    "13": "Heavy snow: > 15 cm/hr",
    "14": "Severe Thunderstorms (gusts 62-87 kmph)",
    "15": "Very Severe Thunderstorms (gusts > 87 kmph)",
    "31": "Thunderstorms with Hail",
    "32": "Severe dust storm",
    "33": "High CG Lightning probability (> 60%)",
}


@dataclass
class ImdDistrictAlertsResult:
    alerts: list[WeatherAlert] = field(default_factory=list)
    status: str = "unavailable"  # not_configured | unavailable | unmapped_district | ok_no_active | ok
    district_id: str | None = None
    district_name: str | None = None
    state: str | None = None


def _normalize_name(name: str) -> str:
    n = (name or "").upper().strip()
    for suffix in (" DISTRICT", " DIST.", " DIST", " ZILLA"):
        if n.endswith(suffix):
            n = n[: -len(suffix)]
    n = re.sub(r"[^A-Z0-9]+", " ", n)
    return " ".join(n.split())


def _district_id_from_row(row: dict[str, Any]) -> str | None:
    value = _pick(row, "Obj_id", "Obj_Id", "OBJ_ID", "obj_id", "id", "Id", "ID")
    if value is None:
        return None
    return str(value).strip()


def _district_name_from_row(row: dict[str, Any]) -> str | None:
    value = _pick(row, "District", "DISTRICT", "Station", "district")
    if value is None:
        return None
    name = str(value).strip()
    return name or None


def _state_from_row(row: dict[str, Any]) -> str | None:
    value = _pick(row, "State", "STATE", "state")
    if value is None:
        return None
    name = str(value).strip()
    return name or None


async def _load_district_catalog() -> list[dict[str, str]]:
    """Official IMD district id/name pairs. IDs come only from IMD responses."""

    async def _fetch() -> list[dict[str, str]]:
        catalog: dict[str, dict[str, str]] = {}

        async def _ingest(path: str) -> None:
            payload = await _imd_get(path)
            for row in _as_list(payload):
                did = _district_id_from_row(row)
                dname = _district_name_from_row(row)
                if not did or not dname:
                    continue
                state = _state_from_row(row)
                entry = {"id": did, "name": dname, "state": state or ""}
                catalog[did] = entry

        try:
            await _ingest("districtwarning")
        except UpstreamAPIError:
            logger.warning("[IMD] district catalog via districtwarning unavailable")

        if not catalog:
            try:
                await _ingest("districtrainfall")
            except UpstreamAPIError:
                logger.warning("[IMD] district catalog via districtrainfall unavailable")

        rows = list(catalog.values())
        if not rows:
            raise UpstreamAPIError("imd", "IMD district catalog unavailable")
        logger.info("[IMD] loaded %d districts into catalog", len(rows))
        return rows

    return await _catalog_cache.get_or_set("imd:district-catalog", _fetch)


def match_district_in_catalog(
    catalog: list[dict[str, str]],
    district_name: str | None,
    state_name: str | None = None,
    city_name: str | None = None,
) -> dict[str, str] | None:
    """Match place names to an official IMD catalog entry. No invented IDs."""
    candidates = [n for n in (district_name, city_name) if n]
    if not candidates:
        return None

    normalized_state = _normalize_name(state_name) if state_name else ""

    for raw in candidates:
        target = _normalize_name(raw)
        if not target:
            continue
        exact = [e for e in catalog if _normalize_name(e["name"]) == target]
        if normalized_state and len(exact) > 1:
            by_state = [e for e in exact if normalized_state in _normalize_name(e.get("state") or "")]
            if by_state:
                exact = by_state
        if len(exact) == 1:
            return exact[0]
        if len(exact) > 1 and not normalized_state:
            # Ambiguous without state — do not guess.
            return None

        # Soft contains match (e.g. "Gautam Buddha Nagar" vs "GAUTAM BUDDHA NAGAR")
        soft = [
            e
            for e in catalog
            if target in _normalize_name(e["name"]) or _normalize_name(e["name"]) in target
        ]
        if normalized_state and soft:
            soft_state = [e for e in soft if normalized_state in _normalize_name(e.get("state") or "")]
            if soft_state:
                soft = soft_state
        if len(soft) == 1:
            return soft[0]
    return None


def _iso_issued(date_part: Any, time_part: Any = None) -> str | None:
    """Build an ISO-ish timestamp only from IMD-provided fields. Never invent one."""
    date_s = str(date_part).strip() if date_part not in (None, "") else ""
    time_s = str(time_part).strip() if time_part not in (None, "") else ""
    if date_s and time_s:
        if re.fullmatch(r"\d{3,4}", time_s):
            time_s = time_s.zfill(4)
            time_s = f"{time_s[:2]}:{time_s[2:]}:00"
        raw = f"{date_s}T{time_s}"
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%d-%m-%YT%H:%M:%S"):
            try:
                return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc).isoformat()
            except ValueError:
                continue
        return f"{date_s}T{time_s}Z"
    if date_s:
        return f"{date_s}T00:00:00Z"
    return None


def _split_codes(raw: Any) -> list[str]:
    if raw is None or raw == "":
        return []
    parts = re.split(r"[,\s]+", str(raw).strip())
    return [p for p in parts if p]


def parse_district_warning_row(row: dict[str, Any]) -> list[WeatherAlert]:
    """Parse one IMD districtwarning row into WeatherAlert list (skips No Warning)."""
    district = _district_name_from_row(row) or "Unknown district"
    district_id = _district_id_from_row(row) or "unknown"
    issued = _iso_issued(_pick(row, "Date", "date"), _pick(row, "UTC", "utc", "Time"))
    # WeatherAlert.issued_at is required; use empty string when IMD omitted the date (do not invent).
    issued_at = issued or ""
    alerts: list[WeatherAlert] = []

    for day in range(1, 6):
        codes = _split_codes(_pick(row, f"Day_{day}", f"Day{day}", f"day_{day}"))
        # Color field names in docs: Day1_Color ... Day5_Color
        color = _pick(row, f"Day{day}_Color", f"Day_{day}_Color", f"day{day}_color")
        color_s = str(color).strip() if color not in (None, "") else ""
        severity = _WARNING_COLOR_SEVERITY.get(color_s, "moderate")

        active_codes = [c for c in codes if c != "1"]
        if not active_codes:
            continue

        labels = [_WARNING_CODE_LABELS.get(c, f"Warning code {c}") for c in active_codes]
        alert_type = _WARNING_CODE_TYPE.get(active_codes[0], "storm")
        title = f"IMD Day {day}: {', '.join(labels)}"
        description = (
            f"Official IMD district warning for {district} (Day {day}). "
            f"Codes: {', '.join(active_codes)}. "
            f"IMD colour code: {color_s or 'n/a'}."
        )
        alerts.append(
            WeatherAlert(
                id=f"imd-warning-{district_id}-day{day}-{'-'.join(active_codes)}",
                title=title,
                description=description,
                severity=severity if color_s else "moderate",
                alert_type=alert_type,
                source="IMD",
                provider_label="IMD - Official Warning",
                area=district,
                issued_at=issued_at,
                updated_at=issued,
            )
        )
    return alerts


def parse_district_nowcast_row(row: dict[str, Any], district_id: str, district_name: str) -> list[WeatherAlert]:
    """Parse one IMD districtnowcast row into WeatherAlert list."""
    color = _pick(row, "color", "Color", "COLOR")
    color_s = str(color).strip() if color not in (None, "") else ""
    # Colour 1 = Green / No Weather — treat as inactive unless message says otherwise.
    if color_s == "1":
        message = str(_pick(row, "message", "Message") or "").strip()
        if not message or message.lower() in {"nil", "no weather", "no warning"}:
            return []

    severity = _NOWCAST_COLOR_SEVERITY.get(color_s, "moderate")
    date_part = _pick(row, "Date", "date")
    toi = _pick(row, "toi", "TOI", "Time")
    issued = _iso_issued(date_part, toi)
    issued_at = issued or ""

    active_labels: list[str] = []
    # Cat fields may be present as flags; prefer consolidated message when available.
    for key, label in _NOWCAST_CAT_LABELS.items():
        if key == "1":
            continue
        # Rows sometimes include CatN columns with the category number or boolean-ish values.
        for cat_key in (f"Cat{key}", f"cat{key}", f"CAT{key}"):
            val = row.get(cat_key)
            if val in (None, "", 0, "0", False):
                continue
            # If the cell equals the category code or is truthy text, treat as active.
            if str(val).strip() in {key, "1", "true", "True", label}:
                active_labels.append(label)
                break
            if str(val).strip() and str(val).strip() not in {"0", "false", "False"}:
                # Non-empty unexpected value — still record the known label for that cat key.
                if key in _NOWCAST_CAT_LABELS:
                    active_labels.append(label)
                break

    message = str(_pick(row, "message", "Message") or "").strip()
    station = str(_pick(row, "Station", "District") or district_name).strip()
    valid_upto = _pick(row, "Vupto", "vupto", "ValidUpto")

    if not message and not active_labels and color_s in {"", "1"}:
        return []

    if message:
        description = message
    elif active_labels:
        description = "; ".join(active_labels)
    else:
        description = f"IMD district nowcast colour code {color_s or 'n/a'} for {station}."

    if valid_upto not in (None, ""):
        description = f"{description} Valid up to {valid_upto} IST."

    title = f"IMD Nowcast: {station}"
    alert_type = "storm"
    joined = (message + " " + " ".join(active_labels)).lower()
    if "rain" in joined:
        alert_type = "rain"
    elif "snow" in joined:
        alert_type = "cold"
    elif "dust" in joined or "wind" in joined:
        alert_type = "wind"
    elif "heat" in joined:
        alert_type = "heat"
    elif "fog" in joined:
        alert_type = "fog"

    return [
        WeatherAlert(
            id=f"imd-nowcast-{district_id}-{date_part or 'latest'}-{color_s or 'x'}",
            title=title,
            description=description[:500],
            severity=severity,
            alert_type=alert_type,
            source="IMD",
            provider_label="IMD - District Nowcast",
            area=station,
            issued_at=issued_at,
            updated_at=issued,
        )
    ]


async def fetch_district_alerts(lat: float, lon: float) -> ImdDistrictAlertsResult:
    """Resolve district + fetch official IMD warning/nowcast alerts for lat/lon."""
    if not is_configured():
        return ImdDistrictAlertsResult(status="not_configured")

    cache_key = f"imd:district-alerts:{round(lat, 2)}:{round(lon, 2)}"

    async def _fetch() -> ImdDistrictAlertsResult:
        try:
            catalog = await _load_district_catalog()
        except UpstreamAPIError:
            logger.warning("[IMD] district alerts unavailable (catalog)")
            return ImdDistrictAlertsResult(status="unavailable")

        place = await geocoding.resolve_india_district(lat, lon)
        match = match_district_in_catalog(
            catalog,
            district_name=place.get("district"),
            state_name=place.get("state"),
            city_name=place.get("city"),
        )
        if not match:
            logger.info(
                "[IMD] unmapped district for lat=%.4f lon=%.4f place=%s",
                lat,
                lon,
                {k: place.get(k) for k in ("district", "state", "city")},
            )
            return ImdDistrictAlertsResult(
                status="unmapped_district",
                district_name=place.get("district") or place.get("city"),
                state=place.get("state"),
            )

        district_id = match["id"]
        district_name = match["name"]
        state = match.get("state") or place.get("state")

        alerts: list[WeatherAlert] = []
        warning_ok = False
        nowcast_ok = False

        try:
            warning_payload = await _imd_get("districtwarning", params={"id": district_id})
            warning_ok = True
            for row in _as_list(warning_payload):
                # Prefer rows matching this district id when a list is returned.
                rid = _district_id_from_row(row)
                if rid and rid != district_id:
                    continue
                alerts.extend(parse_district_warning_row(row))
        except UpstreamAPIError:
            logger.warning("[IMD] districtwarning fetch failed id=%s", district_id)

        try:
            nowcast_payload = await _imd_get("districtnowcast", params={"id": district_id})
            nowcast_ok = True
            rows = _as_list(nowcast_payload)
            for row in rows:
                alerts.extend(parse_district_nowcast_row(row, district_id, district_name))
        except UpstreamAPIError:
            logger.warning("[IMD] districtnowcast fetch failed id=%s", district_id)

        if not warning_ok and not nowcast_ok:
            return ImdDistrictAlertsResult(
                status="unavailable",
                district_id=district_id,
                district_name=district_name,
                state=state,
            )

        status = "ok" if alerts else "ok_no_active"
        logger.info(
            "[IMD] district alerts status=%s id=%s name=%s count=%d",
            status,
            district_id,
            district_name,
            len(alerts),
        )
        return ImdDistrictAlertsResult(
            alerts=alerts,
            status=status,
            district_id=district_id,
            district_name=district_name,
            state=state,
        )

    try:
        return await _district_obs_cache.get_or_set(cache_key, _fetch)
    except Exception:  # noqa: BLE001
        logger.warning("[IMD] unexpected district alerts failure")
        return ImdDistrictAlertsResult(status="unavailable")
