import type {
  GenerationDataResponse,
  HealthResponse,
  MetricsResponse,
  SeriesQuery,
} from "@/types/api";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function toQueryString(query: SeriesQuery = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    let detail = `Request to ${path} failed with ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: unknown };
      if (typeof payload.detail === "string") detail = payload.detail;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  health: (signal?: AbortSignal) =>
    getJson<HealthResponse>("/api/v1/health", signal),

  generationData: (query?: SeriesQuery, signal?: AbortSignal) =>
    getJson<GenerationDataResponse>(
      `/api/v1/generation-data${toQueryString(query)}`,
      signal,
    ),

  metrics: (query?: SeriesQuery, signal?: AbortSignal) =>
    getJson<MetricsResponse>(`/api/v1/metrics${toQueryString(query)}`, signal),
};
