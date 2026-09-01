"""Shared Pydantic schemas used across multiple endpoints."""
from pydantic import BaseModel, Field


class LocationInfo(BaseModel):
    name: str
    country: str | None = None
    admin1: str | None = None
    lat: float
    lon: float
    timezone: str | None = None


class LocationSearchResult(BaseModel):
    name: str
    country: str | None = None
    admin1: str | None = None
    lat: float
    lon: float
    timezone: str | None = None
    population: int | None = None


class ErrorResponse(BaseModel):
    """User-safe error payload - never includes raw stack traces."""

    error: bool = True
    message: str
    source: str | None = Field(default=None, description="Which upstream integration failed")
