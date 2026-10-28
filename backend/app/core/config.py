"""Environment-driven application settings.

Values are read once at import time from the process environment, with
`backend/.env` loaded first for local development.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    project_name: str = "UK Wind Forecast Intelligence API"
    version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = os.getenv("ENVIRONMENT", "development")

    cors_origins: list[str] = field(
        default_factory=lambda: _csv(
            os.getenv("CORS_ORIGINS", "http://localhost:3000")
        )
    )

    elexon_base_url: str = os.getenv(
        "ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1"
    )

    # The challenge dataset is strictly January 2026.
    data_year: int = int(os.getenv("DATA_YEAR", "2026"))
    data_month: int = int(os.getenv("DATA_MONTH", "1"))

    # Day-ahead gate closure (UTC) on the day before delivery.
    gate_closure_hour_utc: int = int(os.getenv("GATE_CLOSURE_HOUR_UTC", "11"))

    cache_dir: Path = Path(
        os.getenv("CACHE_DIR", str(BACKEND_DIR / "data" / "cache"))
    )


settings = Settings()
