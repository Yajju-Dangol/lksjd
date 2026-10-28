"""Ingestion, day-ahead alignment and KPI assembly for January 2026.

Pipeline
--------
1. Fetch FUELHH (WIND) actuals and every WINDFOR vintage published around the
   delivery month, with a local JSON cache as the resilience fallback.
2. For each settlement period pick one forecast vintage:
     - ``day_ahead``: latest forecast published strictly before gate closure
       (11:00 UTC on D-1).
     - ``latest``: most recently published forecast.
3. Build the full 30-minute settlement grid and step-map WINDFOR onto it.
   WINDFOR is published hourly, so each hourly value is applied to the two
   settlement periods it covers (e.g. 13:00 and 13:30 both use the 13:00
   forecast). Exact half-hourly matches win when the API provides them.
4. Compute signed errors (forecast - actual) and summary metrics.
"""

from __future__ import annotations

import logging
import threading
from dataclasses import asdict, dataclass, replace
from datetime import date, datetime, timedelta
from typing import Literal

import pandas as pd

from app.core.config import settings
from app.models.schemas import (
    GenerationDataPoint,
    GenerationDataResponse,
    MetricsResponse,
    Snapshot,
)
from app.services import cache
from app.services.elexon import ElexonClient, ElexonError
from app.services.metrics import compute_error_metrics

logger = logging.getLogger(__name__)

ACTUAL_COLUMNS = ["startTime", "actual_mw"]
FORECAST_COLUMNS = ["startTime", "publishTime", "forecast_mw"]
OUTPUT_COLUMNS = [
    "startTime",
    "publishTime",
    "actual_mw",
    "forecast_mw",
    "error_mw",
]


class DataUnavailableError(RuntimeError):
    """Raised when neither Elexon nor the local cache can supply data."""


@dataclass(frozen=True)
class RawData:
    actuals: pd.DataFrame
    forecasts: pd.DataFrame
    updated_at: datetime
    source: Literal["elexon", "cache"]


_lock = threading.Lock()
_raw_cache: tuple[float, RawData] | None = None


# ---------------------------------------------------------------------------
# Window + normalisation helpers
# ---------------------------------------------------------------------------
def resolve_window(start: date | None, end: date | None) -> tuple[date, date]:
    """Validate the requested range and clamp it to the dataset month."""
    window_start = start or settings.dataset_start
    window_end = end or settings.dataset_end

    if (
        window_start < settings.dataset_start
        or window_start > settings.dataset_end
        or window_end < settings.dataset_start
        or window_end > settings.dataset_end
    ):
        raise ValueError(
            "Date range must fall within "
            f"{settings.dataset_start.isoformat()} and {settings.dataset_end.isoformat()}."
        )
    if window_start > window_end:
        raise ValueError("`start` must be on or before `end`.")
    return window_start, window_end


def _utc(day: date) -> pd.Timestamp:
    return pd.Timestamp(day.isoformat(), tz="UTC")


def _iso(value: pd.Timestamp) -> str:
    return value.tz_convert("UTC").isoformat().replace("+00:00", "Z")


def _normalise_actuals(rows: list[dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=ACTUAL_COLUMNS)

    frame = pd.DataFrame(rows)
    if "fuelType" in frame.columns:
        frame = frame[frame["fuelType"].astype(str).str.upper() == "WIND"]

    frame["startTime"] = pd.to_datetime(frame["startTime"], utc=True, errors="coerce")
    frame["actual_mw"] = pd.to_numeric(frame["generation"], errors="coerce")
    if "publishTime" in frame.columns:
        frame["publishTime"] = pd.to_datetime(
            frame["publishTime"], utc=True, errors="coerce"
        )
    else:
        frame["publishTime"] = pd.NaT

    frame = frame.dropna(subset=["startTime", "actual_mw"])
    # Settlement data can be restated; keep the most recently published row.
    frame = frame.sort_values(["startTime", "publishTime"], na_position="first")
    frame = frame.drop_duplicates("startTime", keep="last")
    return frame[ACTUAL_COLUMNS].reset_index(drop=True)


def _normalise_forecasts(rows: list[dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=FORECAST_COLUMNS)

    frame = pd.DataFrame(rows)
    frame["startTime"] = pd.to_datetime(frame["startTime"], utc=True, errors="coerce")
    frame["publishTime"] = pd.to_datetime(
        frame["publishTime"], utc=True, errors="coerce"
    )
    frame["forecast_mw"] = pd.to_numeric(frame["generation"], errors="coerce")
    frame = frame.dropna(subset=FORECAST_COLUMNS)
    frame = frame.sort_values(["startTime", "publishTime"])
    frame = frame.drop_duplicates(["startTime", "publishTime"], keep="last")
    return frame[FORECAST_COLUMNS].reset_index(drop=True)


def _actuals_to_cache(frame: pd.DataFrame) -> list[dict]:
    return [
        {"startTime": _iso(row.startTime), "generation": float(row.actual_mw)}
        for row in frame.itertuples(index=False)
    ]


def _forecasts_to_cache(frame: pd.DataFrame) -> list[dict]:
    return [
        {
            "startTime": _iso(row.startTime),
            "publishTime": _iso(row.publishTime),
            "generation": float(row.forecast_mw),
        }
        for row in frame.itertuples(index=False)
    ]


# ---------------------------------------------------------------------------
# Cache / fetch orchestration
# ---------------------------------------------------------------------------
def _raw_from_payload(
    payload: cache.CachePayload, source: Literal["elexon", "cache"]
) -> RawData:
    return RawData(
        actuals=_normalise_actuals(payload.actuals),
        forecasts=_normalise_forecasts(payload.forecasts),
        updated_at=payload.updated_at,
        source=source,
    )


def _fetch_and_store() -> RawData:
    client = ElexonClient()

    actual_rows = client.fetch_actual_wind(
        settings.dataset_start, settings.dataset_end
    )
    # Two-day publish lookback covers New Year's Day gate closure; one extra
    # day after month end keeps the "latest" snapshot complete.
    forecast_rows = client.fetch_wind_forecast(
        settings.dataset_start - timedelta(days=2),
        settings.dataset_end + timedelta(days=1),
    )

    actuals = _normalise_actuals(actual_rows)
    forecasts = _normalise_forecasts(forecast_rows)
    if actuals.empty:
        raise ElexonError("Elexon returned no WIND actuals for January 2026.")
    if forecasts.empty:
        raise ElexonError("Elexon returned no WINDFOR rows for January 2026.")

    window_start = _utc(settings.dataset_start)
    window_end = _utc(settings.dataset_end + timedelta(days=1))
    actuals = actuals[
        (actuals["startTime"] >= window_start) & (actuals["startTime"] < window_end)
    ].reset_index(drop=True)
    forecasts = forecasts[
        (forecasts["startTime"] >= window_start)
        & (forecasts["startTime"] < window_end)
    ].reset_index(drop=True)

    # Never let a partial upstream response overwrite a good cache snapshot.
    expected_periods = (
        (settings.dataset_end - settings.dataset_start).days + 1
    ) * 48
    if len(actuals) < expected_periods * 0.95:
        raise ElexonError(
            f"Incomplete FUELHH coverage: {len(actuals)} of ~{expected_periods} "
            "expected settlement periods."
        )
    day_ahead = _select_forecasts(forecasts, "day_ahead")
    day_ahead = day_ahead[
        (day_ahead["startTime"] >= window_start)
        & (day_ahead["startTime"] < window_end)
    ]
    covered_hours = day_ahead["startTime"].dt.floor("h").nunique()
    expected_hours = expected_periods // 2
    if covered_hours < expected_hours * 0.95:
        raise ElexonError(
            f"Incomplete WINDFOR coverage: {covered_hours} of ~{expected_hours} "
            "expected delivery hours have a pre-gate forecast."
        )

    updated_at = cache.write_cache(
        _actuals_to_cache(actuals), _forecasts_to_cache(forecasts)
    )
    return RawData(
        actuals=actuals,
        forecasts=forecasts,
        updated_at=updated_at,
        source="elexon",
    )


def _get_raw() -> RawData:
    """Return the freshest dataset available, falling back to disk."""
    global _raw_cache

    with _lock:
        cache_mtime = (
            settings.cache_file.stat().st_mtime
            if settings.cache_file.exists()
            else 0.0
        )

        if _raw_cache is not None and _raw_cache[0] == cache_mtime:
            raw: RawData | None = _raw_cache[1]
        else:
            payload = cache.read_cache()
            if payload is None:
                raw = None
            else:
                raw = _raw_from_payload(payload, "cache")
                _raw_cache = (cache_mtime, raw)

        if raw is not None and cache.is_fresh(
            raw.updated_at, settings.cache_ttl_seconds
        ):
            return raw

        try:
            fresh = _fetch_and_store()
        except (ElexonError, ValueError) as exc:
            if raw is not None:
                logger.warning(
                    "Elexon unavailable (%s); serving cached January 2026 data "
                    "updated at %s",
                    exc,
                    raw.updated_at.isoformat(),
                )
                return replace(raw, source="cache")
            raise DataUnavailableError(
                "Elexon is unavailable and no local cache exists. "
                f"Underlying error: {exc}"
            ) from exc

        _raw_cache = (settings.cache_file.stat().st_mtime, fresh)
        return fresh


# ---------------------------------------------------------------------------
# Alignment
# ---------------------------------------------------------------------------
def _select_forecasts(forecasts: pd.DataFrame, snapshot: Snapshot) -> pd.DataFrame:
    """Pick one forecast vintage per target `startTime`."""
    if forecasts.empty:
        return forecasts[FORECAST_COLUMNS]

    if snapshot == "latest":
        selected = forecasts.sort_values("publishTime").drop_duplicates(
            "startTime", keep="last"
        )
    else:
        gate_closure = (
            forecasts["startTime"].dt.floor("D")
            - pd.Timedelta(days=1)
            + pd.Timedelta(hours=settings.gate_closure_hour_utc)
        )
        eligible = forecasts[forecasts["publishTime"] < gate_closure]
        selected = eligible.sort_values("publishTime").drop_duplicates(
            "startTime", keep="last"
        )

    return selected[FORECAST_COLUMNS].sort_values("startTime").reset_index(drop=True)


def align_series(
    actuals: pd.DataFrame,
    forecasts: pd.DataFrame,
    *,
    snapshot: Snapshot,
    start: date,
    end: date,
) -> pd.DataFrame:
    """Build the 30-minute grid and attach actuals, forecast and error."""
    window_start = _utc(start)
    window_end = _utc(end) + pd.Timedelta(days=1)

    grid = pd.DataFrame(
        {
            "startTime": pd.date_range(
                window_start, window_end, freq="30min", inclusive="left"
            )
        }
    )

    selected = _select_forecasts(forecasts, snapshot)
    selected = selected[
        (selected["startTime"] >= window_start)
        & (selected["startTime"] < window_end)
    ]

    if selected.empty:
        aligned = grid.assign(publishTime=pd.NaT, forecast_mw=float("nan"))
    else:
        aligned = pd.merge_asof(
            grid.sort_values("startTime"),
            selected.sort_values("startTime"),
            on="startTime",
            direction="backward",
            tolerance=pd.Timedelta(minutes=45),
        )

    actuals_window = actuals[
        (actuals["startTime"] >= window_start) & (actuals["startTime"] < window_end)
    ]
    aligned = aligned.merge(actuals_window, on="startTime", how="left")
    aligned["error_mw"] = aligned["forecast_mw"] - aligned["actual_mw"]

    return aligned[OUTPUT_COLUMNS]


# ---------------------------------------------------------------------------
# Public service API
# ---------------------------------------------------------------------------
def get_generation_data(
    start: date, end: date, snapshot: Snapshot
) -> GenerationDataResponse:
    raw = _get_raw()
    frame = align_series(
        raw.actuals, raw.forecasts, snapshot=snapshot, start=start, end=end
    )

    points = [
        GenerationDataPoint(
            startTime=row.startTime.to_pydatetime(),
            publishTime=(
                None if pd.isna(row.publishTime) else row.publishTime.to_pydatetime()
            ),
            actual_mw=(
                None if pd.isna(row.actual_mw) else round(float(row.actual_mw), 2)
            ),
            forecast_mw=(
                None if pd.isna(row.forecast_mw) else round(float(row.forecast_mw), 2)
            ),
            error_mw=(
                None if pd.isna(row.error_mw) else round(float(row.error_mw), 2)
            ),
        )
        for row in frame.itertuples(index=False)
    ]

    return GenerationDataResponse(
        count=len(points),
        start=start,
        end=end,
        snapshot=snapshot,
        source=raw.source,
        cache_updated_at=raw.updated_at,
        points=points,
    )


def get_metrics(start: date, end: date, snapshot: Snapshot) -> MetricsResponse:
    raw = _get_raw()
    frame = align_series(
        raw.actuals, raw.forecasts, snapshot=snapshot, start=start, end=end
    )
    metrics = compute_error_metrics(frame["error_mw"])
    aligned = frame.dropna(subset=["error_mw"])
    max_error_time = (
        None
        if aligned.empty
        else aligned.loc[aligned["error_mw"].abs().idxmax(), "startTime"].to_pydatetime()
    )

    return MetricsResponse(
        **asdict(metrics),
        max_error_time=max_error_time,
        start=start,
        end=end,
        snapshot=snapshot,
        source=raw.source,
        cache_updated_at=raw.updated_at,
    )
