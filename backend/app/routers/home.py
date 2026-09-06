import asyncio
import json

from fastapi import APIRouter, Query

from ..models.alerts import AlertsResponse, has_severe_alert
from ..models.persona import FarmerProfile, PersonaProfile
from ..models.personalization import HomeResponse
from ..services.air_quality import get_air_quality
from ..services.alerts_engine import generate_derived_alerts
from ..services.alerts_provider import get_official_alerts_bundle
from ..services.astronomy import get_astronomy
from ..services.marine_provider import get_marine
from ..services.persona_engine import build_persona_home
from ..services.recommendation_engine import build_insights_response
from ..services.weather_provider import get_current_weather, get_forecast

router = APIRouter(prefix="/api/home", tags=["home"])


def _parse_interaction_weights(raw: str) -> dict[str, float]:
    weights: dict[str, float] = {}
    for part in raw.split(","):
        if ":" not in part:
            continue
        card, _, count = part.partition(":")
        try:
            weights[card.strip()] = float(count)
        except ValueError:
            continue
    return weights


def _parse_persona_profile(
    persona_profile: str,
    crop: str | None,
    crop_stage: str | None,
    primary_persona: str | None,
) -> PersonaProfile | None:
    profile: PersonaProfile | None = None
    if persona_profile.strip():
        try:
            profile = PersonaProfile.model_validate(json.loads(persona_profile))
        except (json.JSONDecodeError, ValueError):
            profile = None
    if crop or crop_stage or primary_persona:
        base = profile or PersonaProfile()
        farmer = base.farmer or FarmerProfile()
        if crop:
            farmer = farmer.model_copy(update={"crop": crop.strip().lower()})
        if crop_stage:
            farmer = farmer.model_copy(update={"crop_stage": crop_stage.strip().lower()})
        updates: dict = {"farmer": farmer}
        if primary_persona:
            updates["primary_persona"] = primary_persona.strip().lower()
        profile = base.model_copy(update=updates)
    return profile


@router.get("", response_model=HomeResponse)
async def get_home(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    name: str | None = Query(None),
    interests: str = Query(""),
    interaction: str = Query(""),
    persona_profile: str = Query("", description="JSON PersonaProfile"),
    crop: str | None = Query(None),
    crop_stage: str | None = Query(None),
    primary_persona: str | None = Query(None),
    locale: str = Query("en", description="UI locale: en | hi"),
) -> HomeResponse:
    interest_list = [i.strip() for i in interests.split(",") if i.strip()]
    interaction_weights = _parse_interaction_weights(interaction)
    profile = _parse_persona_profile(persona_profile, crop, crop_stage, primary_persona)
    locale_norm = "hi" if locale.strip().lower().startswith("hi") else "en"

    weather_result, forecast_result, air_quality_result, official_result, marine_result, astronomy_result = await asyncio.gather(
        get_current_weather(lat, lon, name),
        get_forecast(lat, lon, days=7, name=name),
        get_air_quality(lat, lon, name),
        get_official_alerts_bundle(lat, lon),
        get_marine(lat, lon, name),
        get_astronomy(lat, lon, name),
        return_exceptions=True,
    )

    if isinstance(weather_result, BaseException):
        raise weather_result

    forecast = None if isinstance(forecast_result, BaseException) else forecast_result
    air_quality = None if isinstance(air_quality_result, BaseException) else air_quality_result
    official_alerts = []
    imd_meta = None
    if not isinstance(official_result, BaseException):
        official_alerts = official_result.alerts
        imd_meta = official_result.imd
    marine = None if isinstance(marine_result, BaseException) else marine_result
    astronomy = None if isinstance(astronomy_result, BaseException) else astronomy_result

    derived = generate_derived_alerts(weather_result, forecast, air_quality)
    all_alerts = official_alerts + derived
    has_severe = has_severe_alert(all_alerts)
    marine_available = bool(marine and marine.available)

    insights = build_insights_response(
        weather_result,
        forecast,
        air_quality,
        interest_list,
        has_severe_alert=has_severe,
        marine_available=marine_available,
        interaction_weights=interaction_weights,
    )
    persona = await build_persona_home(
        weather_result,
        forecast,
        air_quality,
        interest_list,
        profile=profile,
        locale=locale_norm,
    )
    # Prefer persona metric order when interests map to a specialized homepage.
    if persona.metric_priority:
        insights.card_order = list(
            dict.fromkeys([*persona.metric_priority, *insights.card_order])
        )
    alerts = AlertsResponse(
        location_name=weather_result.location.name,
        alerts=all_alerts,
        has_severe=has_severe,
        imd_status=imd_meta.status if imd_meta else None,
        imd_district=imd_meta.district_name if imd_meta else None,
        imd_district_id=imd_meta.district_id if imd_meta else None,
        imd_state=imd_meta.state if imd_meta else None,
    )

    return HomeResponse(
        weather=weather_result,
        forecast=forecast,
        air_quality=air_quality,
        alerts=alerts,
        insights=insights,
        astronomy=astronomy,
        marine=marine,
        persona=persona,
    )
