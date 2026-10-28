"""Environment-driven application settings.

Values are read once at import time from the process environment, with
`backend/.env` loaded first for local development.
"""

from __future__ import annotations

import calendar
import os
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def _csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    project_name: str = "UK Wind Forecast Intelligence API"
    version: str = "0.2.0"
    api_v1_prefix: str = "/api/v1"
    environment: str = os.getenv("ENVIRONMENT", "development")

    cors_origins: list[str] = field(
        default_factory=lambda: _csv(
            os.getenv(
                "CORS_ORIGINS",
                ",".join(
                    [
                        "http://localhost:3000",
                        "http://127.0.0.1:3000",
                        "http://localhost:3001",
                        "http://127.0.0.1:3001",
                    ]
                ),
            )
        )
    )

    # Elexon BMRS Insights API
    elexon_base_url: str = os.getenv(
        "ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1"
    )
    elexon_timeout_seconds: float = float(
        os.getenv("ELEXON_TIMEOUT_SECONDS", "30")
    )
    elexon_max_retries: int = int(os.getenv("ELEXON_MAX_RETRIES", "2"))
    user_agent: str = os.getenv(
        "HTTP_USER_AGENT", "wind-forecast-intelligence/0.2 (+github)"
    )

    # The challenge dataset is strictly January 2026.
    data_year: int = int(os.getenv("DATA_YEAR", "2026"))
    data_month: int = int(os.getenv("DATA_MONTH", "1"))

    # Day-ahead gate closure (UTC) on the day before delivery.
    gate_closure_hour_utc: int = int(os.getenv("GATE_CLOSURE_HOUR_UTC", "11"))

    # Local JSON cache — the single source of truth when Elexon is unavailable.
    cache_file: Path = Path(
        os.getenv(
            "CACHE_FILE",
            str(BACKEND_DIR / "data" / "cache_jan2026.json"),
        )
    )
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "86400"))

    @property
    def dataset_start(self) -> date:
        return date(self.data_year, self.data_month, 1)

    @property
    def dataset_end(self) -> date:
        last_day = calendar.monthrange(self.data_year, self.data_month)[1]
        return date(self.data_year, self.data_month, last_day)


settings = Settings()
