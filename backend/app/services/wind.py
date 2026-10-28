"""Alignment of actual and forecast wind series, plus KPI assembly.

The day-ahead snapshot keeps, for every settlement period, only the latest
forecast published strictly before gate closure (11:00 UTC on D-1). The
"latest" snapshot takes the most recently published forecast instead, so a
trader can compare naive vs. gate-closure-constrained accuracy.
"""

from __future__ import annotations

from datetime import date

from app.models.schemas import MetricsResponse, Snapshot, WindDataResponse
from app.services.metrics import compute_error_metrics  # noqa: F401  (used in Phase 1)


def get_aligned_wind_data(
    *, start: date | None, end: date | None, snapshot: Snapshot
) -> WindDataResponse:
    raise NotImplementedError


def get_metrics(
    *, start: date | None, end: date | None, snapshot: Snapshot
) -> MetricsResponse:
    raise NotImplementedError
