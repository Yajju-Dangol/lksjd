export type Snapshot = "day_ahead" | "latest";
export type DataSource = "elexon" | "cache";

/** Matches `backend/app/models/schemas.py`. */
export interface HealthResponse {
  status: "ok";
  service: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface GenerationDataPoint {
  startTime: string;
  publishTime: string | null;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
}

export interface GenerationDataResponse {
  count: number;
  interval_minutes: 30;
  start: string;
  end: string;
  snapshot: Snapshot;
  source: DataSource;
  cache_updated_at: string;
  points: GenerationDataPoint[];
}

export interface MetricsResponse {
  sample_size: number;
  mae_mw: number;
  rmse_mw: number;
  max_error_mw: number;
  total_net_imbalance_mw: number;
  bias_mw: number;
  over_forecast_pct: number;
  under_forecast_pct: number;
  start: string;
  end: string;
  snapshot: Snapshot;
  source: DataSource;
  cache_updated_at: string;
}

export interface SeriesQuery {
  start?: string;
  end?: string;
  snapshot?: Snapshot;
}
