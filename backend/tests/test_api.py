from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.services import wind
from main import app


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    actuals = pd.DataFrame(
        {
            "startTime": pd.to_datetime(
                ["2026-01-01T00:00Z", "2026-01-01T00:30Z"], utc=True
            ),
            "actual_mw": [100.0, 120.0],
        }
    )
    forecasts = pd.DataFrame(
        {
            "startTime": pd.to_datetime(["2026-01-01T00:00Z"], utc=True),
            "publishTime": pd.to_datetime(["2025-12-31T09:30Z"], utc=True),
            "forecast_mw": [150.0],
        }
    )
    raw = wind.RawData(
        actuals=actuals,
        forecasts=forecasts,
        updated_at=datetime(2026, 10, 28, tzinfo=timezone.utc),
        source="cache",
    )
    monkeypatch.setattr(wind, "_get_raw", lambda: raw)
    return TestClient(app)


def test_health(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_generation_data_contract(client: TestClient) -> None:
    response = client.get(
        "/api/v1/generation-data",
        params={"start": "2026-01-01", "end": "2026-01-01"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 48
    assert body["interval_minutes"] == 30
    assert body["source"] == "cache"
    first = body["points"][0]
    assert set(first) == {
        "startTime",
        "publishTime",
        "actual_mw",
        "forecast_mw",
        "error_mw",
    }
    assert first["startTime"] == "2026-01-01T00:00:00Z"
    assert first["publishTime"] == "2025-12-31T09:30:00Z"
    assert first["forecast_mw"] == 150.0
    assert first["error_mw"] == 50.0
    # 00:30 reuses the 00:00 hourly forecast (both cover the same hour).
    assert body["points"][1]["actual_mw"] == 120.0
    assert body["points"][1]["forecast_mw"] == 150.0
    assert body["points"][1]["error_mw"] == 30.0


def test_metrics_only_counts_aligned_periods(client: TestClient) -> None:
    response = client.get(
        "/api/v1/metrics", params={"start": "2026-01-01", "end": "2026-01-01"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["sample_size"] == 2
    assert body["mae_mw"] == 40.0
    assert body["max_error_time"] == "2026-01-01T00:00:00Z"
    assert body["total_net_imbalance_mw"] == 80.0
    assert body["over_forecast_pct"] == 100.0
    assert body["under_forecast_pct"] == 0.0


def test_rejects_dates_outside_january_2026(client: TestClient) -> None:
    response = client.get(
        "/api/v1/generation-data", params={"start": "2026-02-01"}
    )

    assert response.status_code == 422
    detail = response.json()["detail"]
    assert "2026-01-01" in detail and "2026-01-31" in detail
