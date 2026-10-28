# UK Wind Forecast Intelligence

Full-stack analytics portal for a UK energy utility's day-ahead power
procurement team. It compares **Elexon WINDFOR wind forecasts** with **actual
wind generation (FUELHH)** for **January 2026**, quantifies forecast error, and
translates that error into thermal-backup cost exposure.

> Status: **Phase 1 complete** — Elexon ingestion, gate-closure alignment,
> disk caching and the KPI API are live. The interactive dashboard (Phase 2)
> is next.

## Repository layout

```
wind-app/
├── backend/                          # FastAPI + pandas data engine
│   ├── main.py                       # ASGI entrypoint (CORS, router mounting)
│   ├── requirements.txt
│   ├── requirements-dev.txt          # pytest and friends
│   ├── pytest.ini
│   ├── .env.example
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py
│   │   │   └── v1/endpoints/         # health, generation_data, metrics
│   │   ├── core/config.py            # env settings, gate closure, cache path
│   │   ├── models/schemas.py         # Pydantic response contracts
│   │   └── services/
│   │       ├── elexon.py             # retrying BMRS client
│   │       ├── cache.py              # atomic JSON cache + fallback
│   │       ├── wind.py               # alignment pipeline
│   │       └── metrics.py            # MAE / RMSE / imbalance math
│   ├── data/cache_jan2026.json       # committed January 2026 snapshot
│   └── tests/                        # metric + alignment + fallback tests
├── frontend/                         # Next.js (App Router) + TS + Tailwind
│   ├── src/app/
│   ├── src/components/
│   ├── src/lib/api.ts
│   └── src/types/api.ts
├── .env.example
└── README.md
```

## API contract

| Method | Path                         | Purpose                                                   |
| :----- | :--------------------------- | :-------------------------------------------------------- |
| GET    | `/api/v1/health`             | Liveness probe with service metadata                      |
| GET    | `/api/v1/generation-data`    | 30-minute aligned actual/forecast series                  |
| GET    | `/api/v1/metrics`            | MAE, RMSE, max error, net imbalance, over/under frequency |

Both data endpoints accept `start`, `end` (`YYYY-MM-DD`, inside January 2026)
and `snapshot` (`day_ahead` by default, or `latest`). Interactive docs:
<http://localhost:8000/docs>.

```jsonc
// GET /api/v1/generation-data?start=2026-01-05&end=2026-01-05
{
  "count": 48,
  "interval_minutes": 30,
  "start": "2026-01-05",
  "end": "2026-01-05",
  "snapshot": "day_ahead",
  "source": "cache",
  "cache_updated_at": "2026-10-28T08:55:42Z",
  "points": [
    {
      "startTime": "2026-01-05T00:00:00Z",
      "publishTime": "2026-01-04T09:30:00Z",
      "actual_mw": 10601.0,
      "forecast_mw": 11809.0,
      "error_mw": 1208.0
    }
  ]
}
```

## Data pipeline

1. **Actuals** — `GET /datasets/FUELHH/stream` with `settlementDateFrom`,
   `settlementDateTo` and `fuelType=WIND`. January 2026 yields 1,488 complete
   half-hour settlement periods.
2. **Forecasts** — `GET /datasets/WINDFOR/stream` with
   `publishDateTimeFrom` / `publishDateTimeTo`. The publish window starts two
   days before the month (so New Year's Day has a pre-gate vintage) and ends
   one day after, yielding ~18k vintage rows.
3. **Day-ahead selection** — for each settlement period, keep the latest
   forecast published **strictly before 11:00 UTC on D-1** (market gate
   closure). `snapshot=latest` instead selects the most recent publication for
   comparison.
4. **30-minute alignment** — WINDFOR is published **hourly**, so each hourly
   forecast is applied to the two settlement periods it covers (e.g. 13:00 and
   13:30 use the 13:00 value). Exact half-hourly matches take precedence if
   Elexon ever publishes them.
5. **Errors** — `error_mw = forecast_mw - actual_mw`. Positive values mean the
   utility over-forecast wind and may be exposed to imbalance penalties.

### Metric definitions

| Metric                    | Definition                                                     |
| :------------------------ | :------------------------------------------------------------- |
| `mae_mw`                  | mean of `abs(forecast - actual)`                               |
| `rmse_mw`                 | `sqrt(mean((forecast - actual)^2))`                            |
| `max_error_mw`            | largest absolute error in the window                           |
| `total_net_imbalance_mw`  | signed sum of `forecast - actual` (MW)                         |
| `over_forecast_pct`       | share of aligned periods with `error > 0`                      |
| `under_forecast_pct`      | share with `error < 0` (exact ties count in neither bucket)    |

Metrics are computed only on periods where both actual and forecast exist, so
`sample_size` always reflects real evidence.

**January 2026 day-ahead result:** 1,488 periods, MAE **2,126.12 MW**, RMSE
**2,620.80 MW**, max error **6,857 MW**, net imbalance **2,738,361 MW**, with
**84.41%** of periods over-forecast.

## Resilience & caching

- Dataset snapshot: `backend/data/cache_jan2026.json` (committed, ~1.7 MB) so a
  fresh clone serves data even if Elexon is down.
- Writes are atomic (`.tmp` + `os.replace`), versioned, and timestamped.
- If the cache is older than `CACHE_TTL_SECONDS` (default 24h) the API tries
  Elexon first; on timeout, HTTP 429/5xx or malformed payloads it silently
  serves the cache and logs a warning. Up to two attempts (configurable) with
  exponential backoff.
- A fetch with incomplete FUELHH or WINDFOR coverage is rejected, so a partial
  upstream response can never overwrite the good snapshot.
- Responses report `source` (`elexon` / `cache`) and `cache_updated_at` so the
  UI can surface data provenance.
- If neither source is available, endpoints return `503` with a clear message.

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

Health check: <http://localhost:8000/api/v1/health>

Tests:

```bash
pip install -r requirements-dev.txt
pytest
```

### Frontend

```bash
cd frontend
npm install
# .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Dashboard: <http://localhost:3000>

## Environment variables

| Variable                      | Default                          | Purpose                              |
| :---------------------------- | :------------------------------- | :----------------------------------- |
| `CORS_ORIGINS`                | `http://localhost:3000`          | Comma-separated allowed origins      |
| `ELEXON_BASE_URL`             | `https://data.elexon.co.uk/bmrs/api/v1` | BMRS API base                 |
| `DATA_YEAR` / `DATA_MONTH`    | `2026` / `1`                     | Dataset scope                        |
| `GATE_CLOSURE_HOUR_UTC`       | `11`                             | Day-ahead cut-off on D-1             |
| `CACHE_FILE`                  | `backend/data/cache_jan2026.json`| Cache location                       |
| `CACHE_TTL_SECONDS`           | `86400`                          | Freshness window before refresh      |
| `ELEXON_TIMEOUT_SECONDS`      | `30`                             | Per-request timeout                  |
| `ELEXON_MAX_RETRIES`          | `2`                              | Attempts before falling back         |

## AI tool disclosure

This project was built with AI assistance. Tools used so far: **OpenCode**
(agentic coding assistant powered by DeepSeek V4.1 Flash). All generated code
was reviewed, and the final submission will list every AI tool used.
