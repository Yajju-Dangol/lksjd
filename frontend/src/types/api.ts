export type Snapshot = "day_ahead" | "latest";

/** Matches `backend/app/models/schemas.py`. */
export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface WindDataPoint {
  start_time: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
}

export interface WindDataResponse {
  count: number;
  start: string | null;
  end: string | null;
  points: WindDataPoint[];
}

export interface MetricsResponse {
  sample_size: number;
  mae_mw: number;
  rmse_mw: number;
  bias_mw: number;
  peak_error_mw: number;
  over_forecast_pct: number;
  under_forecast_pct: number;
  snapshot: Snapshot;
}

export interface SeriesQuery {
  start?: string;
  end?: string;
  snapshot?: Snapshot;
}
