"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api, API_BASE_URL } from "@/lib/api";
import { DATASET_END, DATASET_START } from "@/lib/ranges";
import type {
  GenerationDataResponse,
  MetricsResponse,
  Snapshot,
} from "@/types/api";

export interface DashboardData {
  generation: GenerationDataResponse;
  metrics: MetricsResponse;
  baselineMetrics: MetricsResponse;
  monthMetrics: MetricsResponse;
}

interface DashboardState {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

export function useWindDashboard(
  start: string,
  end: string,
  snapshot: Snapshot = "day_ahead",
  externalRefreshToken = 0,
) {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
    updatedAt: null,
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const rangeRef = useRef<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshToken((token) => token + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const rangeKey = `${start}:${end}:${snapshot}`;
    const rangeChanged = rangeRef.current !== rangeKey;
    rangeRef.current = rangeKey;

    setState((previous) => ({
      data: rangeChanged ? null : previous.data,
      loading: true,
      error: null,
      updatedAt: previous.updatedAt,
    }));

    async function load() {
      const generation = await api.generationData(
        { start, end, snapshot },
        controller.signal,
      );
      const metrics = await api.metrics(
        { start, end, snapshot },
        controller.signal,
      );
      const comparisonSnapshot: Snapshot =
        snapshot === "day_ahead" ? "latest" : "day_ahead";
      const baselineMetrics = await api
        .metrics({ start, end, snapshot: comparisonSnapshot }, controller.signal)
        .catch(() => metrics);
      const isFullMonth = start === DATASET_START && end === DATASET_END;
      const monthMetrics = isFullMonth
        ? metrics
        : await api
            .metrics(
              { start: DATASET_START, end: DATASET_END, snapshot },
              controller.signal,
            )
            .catch(() => metrics);

      return { generation, metrics, baselineMetrics, monthMetrics };
    }

    load()
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({
          data,
          loading: false,
          error: null,
          updatedAt: new Date(),
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError
            ? error.message
            : `Could not reach the FastAPI backend. Confirm it is running at ${API_BASE_URL}.`;
        setState((previous) => ({
          ...previous,
          loading: false,
          error: message,
        }));
      });

    return () => controller.abort();
  }, [start, end, snapshot, refreshToken, externalRefreshToken]);

  return { ...state, refresh };
}
