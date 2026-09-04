"""Application configuration loaded from environment variables / backend/.env."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    env: str = "development"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"

    deepseek_api_key: str = ""
    deepseek_model: str = "deepseek-v4-flash"
    deepseek_base_url: str = "https://api.deepseek.com"

    openweathermap_api_key: str = ""
    weatherstack_api_key: str = ""

    stormglass_api_key: str = ""

    imd_api_key: str = ""
    imd_base_url: str = "https://api.imd.gov.in/api/v1"

    incois_api_key: str = ""

    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.gemini_api_key.strip())

    @property
    def has_owm_key(self) -> bool:
        return bool(self.openweathermap_api_key.strip())

    @property
    def has_deepseek_key(self) -> bool:
        return bool(self.deepseek_api_key.strip())

    @property
    def has_weatherstack_key(self) -> bool:
        return bool(self.weatherstack_api_key.strip())

    @property
    def has_stormglass_key(self) -> bool:
        return bool(self.stormglass_api_key.strip())

    @property
    def has_imd_key(self) -> bool:
        return bool(self.imd_api_key.strip())

    @property
    def has_incois_key(self) -> bool:
        return bool(self.incois_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
