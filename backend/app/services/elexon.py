"""Thin client for the Elexon BMRS Insights API.

Phase 1 will add:
  * `fetch_actual_wind`  -> GET /datasets/FUELHH/stream (fuelType == WIND)
  * `fetch_wind_forecast` -> GET /datasets/WINDFOR/stream
plus a disk cache under `settings.cache_dir` keyed by dataset + month.
"""

from __future__ import annotations

import httpx

from app.core.config import settings


class ElexonClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0) -> None:
        self._base_url = (base_url or settings.elexon_base_url).rstrip("/")
        self._timeout = timeout

    def _get(self, path: str, params: dict[str, object]) -> dict[str, object]:
        response = httpx.get(
            f"{self._base_url}/{path.lstrip('/')}",
            params=params,
            timeout=self._timeout,
        )
        response.raise_for_status()
        return response.json()

    def fetch_actual_wind(self, *, start: str, end: str) -> dict[str, object]:
        """Actual wind generation (FUELHH), filtered to fuelType=WIND."""
        raise NotImplementedError

    def fetch_wind_forecast(self, *, start: str, end: str) -> dict[str, object]:
        """Published wind forecasts (WINDFOR), including `publishTime`."""
        raise NotImplementedError
