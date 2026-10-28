# AGENTS.md — Full-Stack SWE Challenge Execution Guide

This document provides complete business context, technical specifications, data engineering pipelines, feature requirements, and presentation guidelines for implementing the **REint Full-Stack Software Engineer Challenge (v4.1)**.

---

## 1. Domain Context & Business Purpose

### 1.1 The UK Energy Market Problem
* **Market Dynamics:** Energy utility companies in the UK purchase electricity one day in advance on the **Day-Ahead Wholesale Market** to serve predicted consumer demand for the next day.
* **The Volatility Risk:** Renewable power generation (specifically **Wind**) is weather-dependent and cheap. However, if actual wind generation falls short of forecasted wind generation, the utility faces an **imbalance**. 
* **Financial Impact:** To prevent power outages, the utility must purchase expensive backup power (e.g., thermal/gas generation) at short notice on the spot market. Over-forecasting wind leads to costly emergency procurement penalties; under-forecasting leads to overpaying for unneeded generation.
* **The Target User:** Energy trading teams at a UK utility responsible for day-ahead power procurement.

### 1.2 The Software Solution
The objective is to build a full-stack web application that:
1. Aggregates and displays UK national wind generation actuals and forecasts for **January 2026**.
2. Quantifies forecast errors dynamically to support risk-adjusted day-ahead purchasing decisions.

---

## 2. Technical Stack & Architecture

### 2.1 Stack Blueprint
* **Frontend:** React / Next.js (TypeScript) with Tailwind CSS, Shadcn UI / Radix UI, and Recharts (or Chart.js).
* **Backend:** Python (FastAPI) with Pandas, Pydantic, and Uvicorn.
* **Containerization:** Docker & Docker Compose.
* **Deployment:** 
  * Frontend: Vercel (or Netlify/Render).
  * Backend: Render, Heroku, or Vercel Serverless Python functions.

### 2.2 System Architecture Diagram
```
                     ┌────────────────────────────────┐
                     │     Next.js / React UI         │
                     │    (Deployed on Vercel)        │
                     └───────────────┬────────────────┘
                                     │ HTTP API Requests
                                     v
                     ┌────────────────────────────────┐
                     │     Python FastAPI Backend     │
                     │  (Data Transformation Engine)  │
                     └───────────────┬────────────────┘
                                     │ Query & Cache
                                     v
                     ┌────────────────────────────────┐
                     │      Elexon BMRS Datasets      │
                     │    (FUELHH & WINDFOR API)      │
                     └────────────────────────────────┘
```

---

## 3. Data Specification & Calculations

### 3.1 Data Source Endpoints (Elexon BMRS)
All data must be scoped exclusively to **January 2026**.

1. **Actual Wind Generation (`FUELHH`):**
   * Endpoint: `https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream`
   * Filtering Rule: Filter records where `fuelType == "WIND"`.
   * Key Fields:
     * `startTime`: Target settlement timestamp (30-minute interval resolution).
     * `generation`: Actual wind power produced (in MW).

2. **Forecasted Wind Generation (`WINDFOR`):**
   * Endpoint: `https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream`
   * Key Fields:
     * `startTime`: Target settlement timestamp matching actuals.
     * `publishTime`: Timestamp when the forecast was generated/published.
     * `generation`: Forecasted wind power (in MW).

### 3.2 Timestamp Alignment & Day-Ahead Logic
To model real-world day-ahead decisions accurately without data leakage:
* Match `actuals` and `forecasts` using the 30-minute `startTime` settlement period.
* Filter forecasts by `publishTime` to ensure only forecasts published **before** market gate closure (e.g., prior to 11:00 AM UTC on day $D-1$) are utilized for day-ahead evaluation.

### 3.3 Quantitative Metrics Formulas
The backend calculation engine must compute the following metrics:

* **Error Delta per Settlement Period:**
  $$\text{Error}_i = \text{Forecast}_i - \text{Actual}_i$$

* **Mean Absolute Error (MAE):**
  $$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |\text{Forecast}_i - \text{Actual}_i|$$

* **Root Mean Squared Error (RMSE):**
  $$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (\text{Forecast}_i - \text{Actual}_i)^2}$$

* **Bias Ratio (Over vs. Under Forecast):**
  $$\text{Over-Forecast \%} = \frac{\text{Count}(\text{Error}_i > 0)}{n} \times 100$$

---

## 4. Key Application Features

| Feature Module | Technical Description | Business Value |
| :--- | :--- | :--- |
| **Interactive Time-Series Chart** | Dual-axis or overlay line chart displaying Actual Generation vs. Forecasted Generation across 30-minute resolution periods for January 2026. | Visualizes weather event divergences and multi-day volatility trends. |
| **KPI Metrics Dashboard** | Cards showing summary statistics: Total MAE (MW), RMSE, Peak Error MW, Over/Under Forecast Ratio. | Gives immediate quantitative feedback on overall forecast reliability. |
| **Snapshot Filter Engine** | Toggle/date picker allowing users to switch between the latest available forecast vs. strict Day-Ahead gate closure snapshots. | Models realistic trader constraint scenarios at market close. |
| **Thermal Imbalance Estimator** | Interactive slider allowing users to adjust expected thermal backup power costs (£/MWh) to estimate financial exposure. | Translates MW error metrics directly into financial cost exposure. |
| **Data Fallback & Caching Layer** | Backend local disk/JSON/SQLite caching mechanism for Elexon API responses. | Eliminates runtime latency and guards against external API downtime during evaluation. |

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Backend Setup & Ingestion (Python / FastAPI)
1. Initialize FastAPI project structure with `main.py`, `services/`, and `models/`.
2. Write Elexon API fetcher logic to stream `FUELHH` and `WINDFOR` data for January 2026.
3. Build a caching layer to save fetched data locally in JSON format to optimize speed.
4. Build Pandas alignment pipeline to clean, merge, and output aligned datasets and KPI calculations.
5. Create REST endpoints:
   * `GET /api/v1/health`
   * `GET /api/v1/wind-data` (Supports date filtering)
   * `GET /api/v1/metrics` (Returns calculated MAE, RMSE, Bias metrics)

### Phase 2: Frontend Dashboard (React / Next.js)
1. Set up Next.js app with Tailwind CSS and UI components.
2. Build interactive time-series chart component using Recharts or Chart.js.
3. Construct KPI summary cards for MAE, RMSE, and Peak Error.
4. Implement date picker filters and thermal procurement cost slider.
5. Fetch data asynchronously from the FastAPI backend and handle loading/error states.

### Phase 3: Containerization & Deployment
1. Create `backend/Dockerfile` and `frontend/Dockerfile`.
2. Create root `docker-compose.yml` to orchestrate both services locally via a single command.
3. Deploy frontend to Vercel and backend to Render/Heroku (or configure Next.js serverless rewrites).
4. Verify live deployment URL in an Incognito window.

### Phase 4: Video Demo & Repository Preparation
1. Create a public GitHub repository with an anonymous name (e.g., `kjhwr-wind-app`).
2. Write a comprehensive `README.md`.
3. Record a max 10-minute unlisted YouTube video containing the Customer Pitch and Tech Review.
4. Submit the completed Microsoft Form.

---

## 6. Docker & Repository Setup

### 6.1 `docker-compose.yml` Template
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend
```

### 6.2 Mandatory `README.md` Checklist
Your public repository `README.md` must contain:
1. **Directory Structure:** Overview of file paths and directory roles.
2. **Local Setup Guide:** Step-by-step instructions for running locally (via `docker compose up --build` or manual installation).
3. **Live Links:** Direct link to the deployed application on Vercel/Heroku/Render.
4. **Explicit AI Tool Disclosure:** Clear statement detailing any AI tools used (e.g., ChatGPT, Claude, GitHub Copilot).

---

## 7. Video Presentation Guide (Max 10 Minutes Total)

> **Important:** Submitting without the video results in instant disqualification.

### Part 1: Customer Pitch (Max 5 Minutes)
* **Audience:** Energy Utility Client / Power Procurement Team.
* **Goal:** Demonstrate business value and sell the portal solution.
* **Structure:**
  * **0:00 – 1:00:** Frame the business problem (wind forecast volatility vs. expensive thermal backup procurement penalties).
  * **1:00 – 3:00:** Live screen demo of the portal showing January 2026 data, forecast vs. actual charts, and high-divergence days.
  * **3:00 – 4:30:** Showcase actionable trading insights (e.g., using quantified MAE/RMSE to adjust purchase volumes before gate closure).
  * **4:30 – 5:00:** Present ROI summary and proposed Phase 2 features (e.g., solar integration, automated alerts).

### Part 2: Technical Review (Max 5 Minutes)
* **Audience:** Internal Tech Lead.
* **Goal:** Explain technical implementation, data accuracy, and software design.
* **Structure:**
  * **0:00 – 1:00:** System architecture overview (React/Next.js frontend, Python FastAPI backend, Docker setup).
  * **1:00 – 2:30:** Data pipeline walkthrough (ingesting `FUELHH` & `WINDFOR`, timestamp alignment on `startTime`, filtering by `publishTime`, error metric math).
  * **2:30 – 3:30:** Frontend state management and rendering optimization for 30-minute time-series datasets.
  * **3:30 – 4:30:** Docker orchestration, live Vercel deployment, and AI tools disclosure statement.
  * **4:30 – 5:00:** Edge-case management (missing data handling, timezone alignment) and codebase maintainability.

---

## 8. Final Verification & Submission Checklist

- [ ] Data is strictly scoped to **January 2026** wind power from Elexon.
- [ ] Backend is built in Python (FastAPI/Flask) and computes quantitative error metrics (MAE/RMSE).
- [ ] Frontend is built in React/Next.js and displays interactive actual vs. forecast charts.
- [ ] Project is fully containerized with `Dockerfile` and `docker-compose.yml`.
- [ ] Project is live on Vercel/Heroku/Render.
- [ ] Public GitHub repository is created under an anonymous name (e.g., `kjhwr-app`).
- [ ] `README.md` includes file structure, run instructions, live URL, and AI disclosures.
- [ ] Unlisted YouTube video (max 10 mins, 5-min pitch + 5-min tech review) is recorded.
- [ ] All URLs are tested in an **Incognito Browser Window** to confirm public access.
- [ ] Final submission form completed: `https://forms.cloud.microsoft/r/FTX6K2bbnU`.