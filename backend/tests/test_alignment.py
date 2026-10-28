from __future__ import annotations

from dataclasses import replace
from datetime import date, datetime, timedelta, timezone

import pandas as pd
import pytest

from app.services import wind
from app.services.cache import CachePayload
from app.services.elexon import ElexonError

JAN_2 = date(2026, 1, 2)


def _forecast_frame() -> pd.DataFrame:
    rows = [
        # (target startTime, publishTime, forecast MW)
        ("2026-01-02T00:00Z", "2025-12-31T09:30Z", 120.0),
        ("2026-01-02T01:00Z", "2025-12-31T09:30Z", 110.0),
        ("2026-01-02T00:00Z", "2026-01-01T09:30Z", 150.0),
        ("2026-01-02T01:00Z", "2026-01-01T09:30Z", 140.0),
        # Published after gate closure — must be ignored in day_ahead mode.
        ("2026-01-02T00:00Z", "2026-01-01T15:30Z", 170.0),
        ("2026-01-02T01:00Z", "2026-01-01T15:30Z", 160.0),
        # Post-delivery vintage, used only by the "latest" snapshot.
        ("2026-01-02T00:00Z", "2026-01-02T02:30Z", 160.0),
        ("2026-01-02T01:00Z", "2026-01-02T02:30Z", 145.0),
    ]
    frame = pd.DataFrame(rows, columns=["startTime", "publishTime", "forecast_mw"])
    frame["startTime"] = pd.to_datetime(frame["startTime"], utc=True)
    frame["publishTime"] = pd.to_datetime(frame["publishTime"], utc=True)
    return frame


def _actual_frame() -> pd.DataFrame:
    frame = pd.DataFrame(
        {
            "startTime": pd.to_datetime(
                [
                    "2026-01-02T00:00Z",
                    "2026-01-02T00:30Z",
                    "2026-01-02T01:00Z",
                    "2026-01-02T01:30Z",
                ],
                utc=True,
            ),
            "actual_mw": [100.0, 110.0, 120.0, 130.0],
        }
    )
    return frame


def test_day_ahead_snapshot_respects_gate_closure() -> None:
    aligned = wind.align_series(
        _actual_frame(), _forecast_frame(), snapshot="day_ahead", start=JAN_2, end=JAN_2
    )

    assert len(aligned) == 48
    assert set(aligned["publishTime"].dropna()) == {
        pd.Timestamp("2026-01-01T09:30Z")
    }

    first = aligned.iloc[0]
    assert first["forecast_mw"] == 150.0
    assert first["error_mw"] == 50.0


def test_hourly_forecast_is_applied_to_both_half_hours() -> None:
    aligned = wind.align_series(
        _actual_frame(), _forecast_frame(), snapshot="day_ahead", start=JAN_2, end=JAN_2
    )

    first_hour = aligned.iloc[0:2]
    assert list(first_hour["forecast_mw"]) == [150.0, 150.0]
    assert list(first_hour["error_mw"]) == [50.0, 40.0]

    second_hour = aligned.iloc[2:4]
    assert list(second_hour["forecast_mw"]) == [140.0, 140.0]
    assert list(second_hour["error_mw"]) == [20.0, 10.0]


def test_latest_snapshot_uses_newest_publish() -> None:
    aligned = wind.align_series(
        _actual_frame(), _forecast_frame(), snapshot="latest", start=JAN_2, end=JAN_2
    )

    assert set(aligned["publishTime"].dropna()) == {
        pd.Timestamp("2026-01-02T02:30Z")
    }
    assert aligned.iloc[0]["forecast_mw"] == 160.0


def test_periods_outside_forecast_horizon_stay_empty() -> None:
    aligned = wind.align_series(
        _actual_frame(), _forecast_frame(), snapshot="day_ahead", start=JAN_2, end=JAN_2
    )

    # Only the synthetic 00:00–01:30 actuals exist; the rest of the day is null.
    assert aligned["actual_mw"].notna().sum() == 4
    assert aligned["forecast_mw"].notna().sum() == 4
    assert aligned["error_mw"].notna().sum() == 4


class _OfflineClient:
    def __init__(self) -> None:
        raise ElexonError("simulated outage")


def _stale_payload() -> CachePayload:
    return CachePayload(
        actuals=[{"startTime": "2026-01-02T00:00:00Z", "generation": 100.0}],
        forecasts=[
            {
                "startTime": "2026-01-02T00:00:00Z",
                "publishTime": "2026-01-01T09:30:00Z",
                "generation": 150.0,
            }
        ],
        updated_at=datetime.now(timezone.utc) - timedelta(days=5),
    )


def test_falls_back_to_cache_when_elexon_is_down(monkeypatch, tmp_path) -> None:
    cache_path = tmp_path / "cache_jan2026.json"
    cache_path.write_text("{}", encoding="utf-8")
    payload = _stale_payload()

    monkeypatch.setattr(
        wind,
        "settings",
        replace(wind.settings, cache_file=cache_path, cache_ttl_seconds=60),
    )
    monkeypatch.setattr(wind.cache, "read_cache", lambda: payload)
    monkeypatch.setattr(wind, "ElexonClient", _OfflineClient)
    monkeypatch.setattr(wind, "_raw_cache", None)

    raw = wind._get_raw()

    assert raw.source == "cache"
    assert raw.updated_at == payload.updated_at
    assert len(raw.actuals) == 1


def test_raises_when_offline_without_cache(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        wind,
        "settings",
        replace(wind.settings, cache_file=tmp_path / "missing.json"),
    )
    monkeypatch.setattr(wind.cache, "read_cache", lambda: None)
    monkeypatch.setattr(wind, "ElexonClient", _OfflineClient)
    monkeypatch.setattr(wind, "_raw_cache", None)

    with pytest.raises(wind.DataUnavailableError):
        wind._get_raw()
