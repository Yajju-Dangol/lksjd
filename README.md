# UK Wind Forecast Intelligence

Full-stack analytics portal for a UK energy utility's day-ahead power
procurement team. It compares **Elexon WINDFOR wind forecasts** with **actual
wind generation (FUELHH)** for **January 2026**, quantifies the forecast error,
and translates that error into thermal-backup cost exposure.

> Status: **Phase 1 scaffold** — repository structure, API contract and UI shell
> are in place. Elexon ingestion, alignment and the interactive dashboard are
> the next milestones.

## Repository layout

```
wind-app/
├── backend/                      # FastAPI + pandas data engine
│   ├── main.py                   # ASGI entrypoint (CORS, router mounting)
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py         # aggregates versioned routers
│   │   │   └── v1/endpoints/     # health.py, wind_data.py, metrics.py
│   │   ├── core/config.py        # env-driven settings (Elexon, gate closure)
│   │   ├── models/schemas.py     # Pydantic API contracts
│   │   └── services/             # elexon.py, wind.py, metrics.py
│   └── data/cache/               # on-disk cache for raw Elexon payloads
├── frontend/                     # Next.js (App Router) + TS + Tailwind
│   ├── src/app/                  # routes, layout, global styles
│   ├── src/components/           # dashboard UI
│   ├── src/lib/api.ts            # typed client for the FastAPI service
│   ├── src/types/                # shared API types
│   └── .env.example
├── .env.example                  # root template for docker-compose
├── docker-compose.yml            # (Phase 3)
└── README.md
```

## API contract

| Method | Path                        | Purpose                                              |
| :----- | :-------------------------- | :--------------------------------------------------- |
| GET    | `/api/v1/health`            | Liveness probe with service metadata                 |
| GET    | `/api/v1/wind-data`         | Aligned 30-min actual vs. forecast series (`start`, `end`, `snapshot`) |
| GET    | `/api/v1/metrics`           | MAE, RMSE, bias, peak error, over/under-forecast %   |

`snapshot` is either `day_ahead` (forecasts published before **11:00 UTC on
D-1**) or `latest` (most recent published forecast). Interactive docs are
served at `http://localhost:8000/docs`.

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

### Frontend

```bash
cd frontend
npm install
# .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Dashboard: <http://localhost:3000>

## Data notes

* **Actuals** — Elexon `FUELHH`, filtered to `fuelType == "WIND"`.
* **Forecasts** — Elexon `WINDFOR`, retaining `publishTime` so each settlement
  period can be pinned to the forecast vintage available at gate closure.
* **Scope** — January 2026 only; timestamps normalised to UTC.
* Errors are signed as `forecast − actual`, so a positive bias means the utility
  over-forecast wind and may face imbalance exposure.

## AI tool disclosure

This project was built with AI assistance. Tools used so far: **OpenCode**
(agentic coding assistant powered by DeepSeek V4.1 Flash). All generated code
was reviewed, and the final submission will list every AI tool used.
