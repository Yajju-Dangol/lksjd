from __future__ import annotations

import pandas as pd
import pytest

from app.services.metrics import compute_error_metrics


def test_known_error_series() -> None:
    metrics = compute_error_metrics(pd.Series([10.0, -5.0, 0.0, 20.0]))

    assert metrics.sample_size == 4
    assert metrics.mae_mw == 8.75
    assert metrics.rmse_mw == 11.46
    assert metrics.max_error_mw == 20.0
    assert metrics.total_net_imbalance_mw == 25.0
    assert metrics.bias_mw == 6.25
    assert metrics.over_forecast_pct == 50.0
    assert metrics.under_forecast_pct == 25.0


def test_missing_values_are_excluded() -> None:
    metrics = compute_error_metrics(pd.Series([10.0, None, -2.0]))

    assert metrics.sample_size == 2
    assert metrics.mae_mw == 6.0
    assert metrics.total_net_imbalance_mw == 8.0


def test_empty_series_raises() -> None:
    with pytest.raises(ValueError, match="No aligned settlement periods"):
        compute_error_metrics(pd.Series([], dtype="float64"))
