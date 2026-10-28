"""Thin, retrying client for the Elexon BMRS Insights API.

Endpoint contract (verified against the live API in October 2026):
  * FUELHH filters by `settlementDateFrom` / `settlementDateTo` (dates).
  * WINDFOR filters by `publishDateTimeFrom` / `publishDateTimeTo` (dates);
    `startTime` filtering is not supported, so the delivery window is applied
    client-side after ingestion.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import date

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class ElexonError(RuntimeError):
    """Raised when Elexon cannot be reached or returns an unusable payload."""


class ElexonClient:
    def __init__(
        self,
        base_url: str | None = None,
        timeout: float | None = None,
        retries: int | None = None,
    ) -> None:
        self._base_url = (base_url or settings.elexon_base_url).rstrip("/")
        self._timeout = timeout or settings.elexon_timeout_seconds
        self._retries = max(1, retries or settings.elexon_max_retries)

    def fetch_actual_wind(self, start: date, end: date) -> list[dict]:
        """Actual wind generation (FUELHH) for a settlement-date range."""
        return self._get(
            "/datasets/FUELHH/stream",
            {
                "settlementDateFrom": start.isoformat(),
                "settlementDateTo": end.isoformat(),
                "fuelType": "WIND",
            },
        )

    def fetch_wind_forecast(
        self, publish_from: date, publish_to: date
    ) -> list[dict]:
        """All WINDFOR vintages published in the supplied date range."""
        return self._get(
            "/datasets/WINDFOR/stream",
            {
                "publishDateTimeFrom": publish_from.isoformat(),
                "publishDateTimeTo": publish_to.isoformat(),
            },
        )

    def _get(self, path: str, params: dict[str, str]) -> list[dict]:
        url = f"{self._base_url}{path}"
        last_error: Exception | None = None

        with httpx.Client(
            timeout=httpx.Timeout(self._timeout, connect=5.0),
            headers={"User-Agent": settings.user_agent},
            follow_redirects=True,
        ) as client:
            for attempt in range(1, self._retries + 1):
                try:
                    response = client.get(url, params=params)
                    if response.status_code in RETRYABLE_STATUS:
                        raise ElexonError(
                            f"Elexon returned HTTP {response.status_code}"
                        )
                    response.raise_for_status()
                    payload = response.json()
                except (httpx.HTTPError, json.JSONDecodeError, ElexonError) as exc:
                    last_error = exc
                    if attempt < self._retries:
                        delay = 0.5 * 2 ** (attempt - 1)
                        logger.warning(
                            "Elexon request %s failed (attempt %d/%d): %s — retrying in %.1fs",
                            path,
                            attempt,
                            self._retries,
                            exc,
                            delay,
                        )
                        time.sleep(delay)
                    continue

                rows = payload.get("data", payload) if isinstance(payload, dict) else payload
                if not isinstance(rows, list):
                    raise ElexonError(
                        f"Unexpected payload from {path}: {type(rows).__name__}"
                    )
                logger.info("Fetched %d rows from %s", len(rows), path)
                return rows

        raise ElexonError(
            f"Elexon request to {path} failed after {self._retries} attempts: {last_error}"
        ) from last_error
