"""Agromet unavailable state remains honest — no fabricated advisory text."""
import pytest

from app.models.persona import FarmerProfile
from app.services import agromet


@pytest.mark.asyncio
async def test_agromet_unavailable_without_path(monkeypatch):
    monkeypatch.setattr(agromet.settings, "imd_api_key", "k")
    monkeypatch.setattr(agromet.settings, "imd_email", "a@b.c")
    monkeypatch.setattr(agromet.settings, "imd_password", "x")
    monkeypatch.setattr(agromet.settings, "imd_agromet_advisory_path", "")
    status = await agromet.fetch_official_agromet_advisory(
        18.5, 73.8, FarmerProfile(crop="wheat", crop_stage="vegetative"), locale="en"
    )
    assert status.available is False
    assert status.status == "unavailable"
    assert status.portal_url
    assert "not" in status.message.lower() or "unavailable" in status.message.lower()
    assert status.advisory_text is None


@pytest.mark.asyncio
async def test_agromet_not_configured_without_credentials(monkeypatch):
    monkeypatch.setattr(agromet.settings, "imd_api_key", "")
    monkeypatch.setattr(agromet.settings, "imd_email", "")
    monkeypatch.setattr(agromet.settings, "imd_password", "")
    status = await agromet.fetch_official_agromet_advisory(18.5, 73.8)
    assert status.available is False
    assert status.status == "not_configured"


@pytest.mark.asyncio
async def test_agromet_hindi_message(monkeypatch):
    monkeypatch.setattr(agromet.settings, "imd_api_key", "k")
    monkeypatch.setattr(agromet.settings, "imd_email", "a@b.c")
    monkeypatch.setattr(agromet.settings, "imd_password", "x")
    monkeypatch.setattr(agromet.settings, "imd_agromet_advisory_path", "")
    status = await agromet.fetch_official_agromet_advisory(
        18.5, 73.8, FarmerProfile(crop="wheat", crop_stage="vegetative"), locale="hi"
    )
    assert status.available is False
    assert "Official IMD Meghdoot/KALP crop advisory API is not wired" not in status.message
    assert "जुड़ा नहीं" in status.message or "उपलब्ध" in status.message
    assert "KALP" in status.message
