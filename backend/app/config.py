"""Validated runtime configuration."""

from functools import lru_cache
from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "LTT Churn Intelligence API"
    environment: str = "development"
    database_url: str | None = None
    postgres_host: str | None = None
    postgres_port: int = Field(default=5432, ge=1, le=65_535)
    postgres_db: str = "ltt_churn"
    postgres_user: str = "ltt_churn"
    postgres_password: str | None = None
    predictions_path: Path = BACKEND_ROOT / "data" / "customer_predictions.csv"
    metadata_path: Path = BACKEND_ROOT / "artifacts" / "model_metadata.json"
    synthetic_records: int = Field(default=12_000, ge=10_000, le=200_000)

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        if self.postgres_host and self.postgres_password:
            password = quote_plus(self.postgres_password)
            return (
                f"postgresql+psycopg://{self.postgres_user}:{password}@"
                f"{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            )
        return f"sqlite:///{BACKEND_ROOT / 'ltt_churn.db'}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
