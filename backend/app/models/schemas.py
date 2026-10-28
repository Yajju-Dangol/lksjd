"""Public API schemas shared by the routers and the services layer."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Snapshot = Literal["day_ahead", "latest"]
DataSource = Literal["elexon", "cache"]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    environment: str
    timestamp: datetime


class GenerationDataPoint(BaseModel):
    """One 30-minute settlement period of aligned wind data.

    `publishTime` identifies the WINDFOR vintage used for this period, which
    lets a trader audit exactly what was knowable at gate closure.
    """

    startTime: datetime = Field(description="Settlement period start (UTC)")
    publishTime: datetime | None = Field(
        default=None, description="Publication time of the selected forecast"
    )
    actual_mw: float | None = Field(default=None, description="FUELHH wind generation")
    forecast_mw: float | None = Field(default=None, description="WINDFOR generation")
    error_mw: float | None = Field(
        default=None, description="forecast_mw - actual_mw"
    )


class GenerationDataResponse(BaseModel):
    count: int
    interval_minutes: Literal[30] = 30
    start: date
    end: date
    snapshot: Snapshot
    source: DataSource
    cache_updated_at: datetime
    points: list[GenerationDataPoint]


class MetricsResponse(BaseModel):
    sample_size: int = Field(description="Aligned settlement periods with both values")
    mae_mw: float = Field(description="Mean absolute error (MW)")
    rmse_mw: float = Field(description="Root mean squared error (MW)")
    max_error_mw: float = Field(description="Largest absolute error observed (MW)")
    total_net_imbalance_mw: float = Field(
        description="Signed sum of (forecast - actual) across the window (MW)"
    )
    bias_mw: float = Field(
        description="Mean signed error; positive means over-forecasting"
    )
    over_forecast_pct: float = Field(
        description="Share of periods where forecast > actual"
    )
    under_forecast_pct: float = Field(
        description="Share of periods where forecast < actual"
    )
    start: date
    end: date
    snapshot: Snapshot
    source: DataSource
    cache_updated_at: datetime
