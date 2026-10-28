"""Public API schemas shared by the routers and the services layer."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

Snapshot = Literal["day_ahead", "latest"]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str
    version: str
    environment: str
    timestamp: datetime


class WindDataPoint(BaseModel):
    """One 30-minute settlement period of aligned wind data."""

    start_time: datetime = Field(description="Settlement period start (UTC)")
    actual_mw: float | None = Field(default=None, description="FUELHH wind generation")
    forecast_mw: float | None = Field(default=None, description="WINDFOR generation")
    error_mw: float | None = Field(
        default=None, description="forecast_mw - actual_mw"
    )


class WindDataResponse(BaseModel):
    count: int
    start: date | None = None
    end: date | None = None
    points: list[WindDataPoint]


class MetricsResponse(BaseModel):
    sample_size: int = Field(description="Number of aligned settlement periods")
    mae_mw: float
    rmse_mw: float
    bias_mw: float = Field(
        description="Mean of (forecast - actual); positive means over-forecasting"
    )
    peak_error_mw: float = Field(description="Largest absolute error observed")
    over_forecast_pct: float
    under_forecast_pct: float
    snapshot: Snapshot
