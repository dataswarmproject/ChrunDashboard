"""Validated runtime configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LTT Churn Intelligence API"
    environment: str = "development"
    database_url: str = Field(default=f"sqlite:///{BACKEND_ROOT / 'ltt_churn.db'}")
    predictions_path: Path = BACKEND_ROOT / "data" / "customer_predictions.csv"
    metadata_path: Path = BACKEND_ROOT / "artifacts" / "model_metadata.json"
    synthetic_records: int = Field(default=12_000, ge=10_000, le=200_000)


@lru_cache
def get_settings() -> Settings:
    return Settings()
