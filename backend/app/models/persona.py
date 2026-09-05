"""Persona personalization models — structured homepage payload (not interest tags alone)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

PersonaId = Literal[
    "farmer",
    "runner",
    "traveller",
    "marine",
    "family",
    "health_vulnerable",
    "disaster",
]

ProvenanceKind = Literal["official", "derived", "estimated", "unavailable"]


class FarmerProfile(BaseModel):
    crop: str = "wheat"
    crop_stage: str = "vegetative"
    sowing_date: str | None = None
    irrigation_type: str | None = None
    field_size_ha: float | None = None


class PersonaProfile(BaseModel):
    """Optional depth beyond interest keys. Persisted client-side / preferences."""

    primary_persona: PersonaId | None = None
    farmer: FarmerProfile | None = None


class PersonaCard(BaseModel):
    """One expandable homepage section card."""

    id: str
    title: str
    summary: str
    detail: str = ""
    recommendation: str = ""
    supporting_data: dict[str, Any] = Field(default_factory=dict)
    provenance: ProvenanceKind = "derived"
    source_label: str = "MAUSAM"
    issued_at: str | None = None
    updated_at: str | None = None
    reason: str = ""
    label: str = "Weather-based recommendation"
    severity: str | None = None  # info | watch | advisory | warning
    accent: str | None = None


class AgrometAdvisoryStatus(BaseModel):
    """Honest status for official IMD Agromet / Meghdoot / KALP advisory."""

    available: bool = False
    status: str = "unavailable"  # available | unavailable | not_configured | error
    message: str = (
        "Official IMD crop advisory (Meghdoot/KALP) is not connected yet. "
        "Weather-based farm guidance below is derived by MAUSAM and is not an official IMD advisory."
    )
    advisory_text: str | None = None
    weather_condition: str | None = None
    recommendations: list[str] = Field(default_factory=list)
    crop_relevance: str | None = None
    crop_stage_relevance: str | None = None
    language: str | None = None
    source_label: str = "IMD Agromet"
    issued_at: str | None = None
    updated_at: str | None = None
    portal_url: str | None = "https://webgis.imd.gov.in/agro"


class PersonaHomePayload(BaseModel):
    persona: PersonaId
    section_order: list[str]
    hero_title: str
    hero_subtitle: str
    metric_priority: list[str] = Field(default_factory=list)
    cards: list[PersonaCard] = Field(default_factory=list)
    agromet: AgrometAdvisoryStatus | None = None
    quick_actions: list[str] = Field(default_factory=list)
