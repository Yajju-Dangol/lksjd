"""Forecast-error metric math.

Kept framework-free so it can be unit tested and reused by ingestion jobs.
All inputs are in MW on 30-minute settlement periods.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class ErrorMetrics:
    sample_size: int
    mae_mw: float
    rmse_mw: float
    bias_mw: float
    peak_error_mw: float
    over_forecast_pct: float
    under_forecast_pct: float


def compute_error_metrics(errors: pd.Series) -> ErrorMetrics:
    """Summarise signed forecast errors (forecast - actual).

    Rows where either side is missing must be dropped by the caller so the
    sample size reflects genuinely aligned settlement periods.
    """
    clean = errors.dropna().astype(float)
    if clean.empty:
        raise ValueError("No aligned settlement periods to evaluate.")

    n = len(clean)
    absolute = clean.abs()
    over = int((clean > 0).sum())

    return ErrorMetrics(
        sample_size=n,
        mae_mw=round(float(absolute.mean()), 2),
        rmse_mw=round(float((clean.pow(2).mean()) ** 0.5), 2),
        bias_mw=round(float(clean.mean()), 2),
        peak_error_mw=round(float(absolute.max()), 2),
        over_forecast_pct=round(over / n * 100, 2),
        under_forecast_pct=round((n - over) / n * 100, 2),
    )
