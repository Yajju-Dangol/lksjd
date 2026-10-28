"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Grid3X3, TriangleAlert } from "lucide-react";

import { ViewError } from "@/components/views/view-state";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useWindDashboard } from "@/hooks/use-wind-dashboard";
import { formatDate, formatNumber, formatPct } from "@/lib/format";
import { DATASET_END, DATASET_START } from "@/lib/ranges";

function settlementPeriod(iso: string): number {
  const date = new Date(iso);
  return Math.floor((date.getUTCHours() * 60 + date.getUTCMinutes()) / 30) + 1;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cellColor(error: number | null, maxAbs: number): string {
  if (error == null || maxAbs <= 0) return "rgba(63, 63, 70, 0.25)";
  const intensity = 0.12 + 0.78 * Math.min(Math.abs(error) / maxAbs, 1);
  if (Math.abs(error) < 1) return "rgba(113, 113, 122, 0.18)";
  return error > 0
    ? `rgba(244, 63, 94, ${intensity})`
    : `rgba(52, 211, 153, ${intensity})`;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
      <CardContent className="px-4 py-3">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
          <Icon aria-hidden className="size-3" />
          {label}
        </p>
        <p className="mt-1.5 text-lg font-semibold tabular-nums text-zinc-100">
          {value}
        </p>
        <p className="mt-0.5 text-[10px] tabular-nums text-zinc-600">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function ErrorAnalyticsView({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const { data, loading, error, refresh } = useWindDashboard(
    DATASET_START,
    DATASET_END,
    "day_ahead",
    refreshToken,
  );
  const points = useMemo(
    () => data?.generation.points ?? [],
    [data],
  );

  const analysis = useMemo(() => {
    const cells = points.filter((point) => point.error_mw != null);
    const dates = [...new Set(cells.map((point) => dayKey(point.startTime)))].sort();
    const matrix = new Map<string, Map<number, number>>();
    const errorsByPeriod = new Map<number, number[]>();
    let maxAbs = 0;
    let over = 0;

    for (const point of cells) {
      const error = point.error_mw ?? 0;
      const date = dayKey(point.startTime);
      const period = settlementPeriod(point.startTime);
      const row = matrix.get(date) ?? new Map<number, number>();
      row.set(period, error);
      matrix.set(date, row);
      const periodErrors = errorsByPeriod.get(period) ?? [];
      periodErrors.push(Math.abs(error));
      errorsByPeriod.set(period, periodErrors);
      maxAbs = Math.max(maxAbs, Math.abs(error));
      if (error > 0) over += 1;
    }

    const averageByPeriod = Array.from({ length: 48 }, (_, index) => {
      const values = errorsByPeriod.get(index + 1) ?? [];
      return {
        period: index + 1,
        average: values.length > 0 ? mean(values) : null,
      };
    });
    const worst = averageByPeriod
      .filter(
        (item): item is { period: number; average: number } =>
          item.average != null,
      )
      .sort((left, right) => right.average - left.average)[0];

    return {
      dates,
      matrix,
      maxAbs,
      overPct: cells.length > 0 ? (over / cells.length) * 100 : 0,
      averageByPeriod,
      worst,
    };
  }, [points]);

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] bg-zinc-900/70" />
          ))}
        </div>
        <Skeleton className="h-[620px] bg-zinc-900/70" />
      </div>
    );
  }

  if (error && !data) {
    return <ViewError message={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Worst settlement period"
          value={analysis.worst ? `SP ${analysis.worst.period}` : "—"}
          detail={
            analysis.worst
              ? `${formatNumber(analysis.worst.average)} MW average miss`
              : "No aligned periods"
          }
          icon={Grid3X3}
        />
        <StatCard
          label="Peak error"
          value={`${formatNumber(analysis.maxAbs)} MW`}
          detail="Largest single-period deviation"
          icon={TriangleAlert}
        />
        <StatCard
          label="Over-forecast"
          value={formatPct(analysis.overPct, 1)}
          detail="Share of all settlement periods"
          icon={Activity}
        />
      </div>

      <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
        <CardContent className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium tracking-tight text-zinc-200">
                Settlement period heatmap
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                January 2026 · SP 1–48 · forecast minus actual
              </p>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-rose-500/80" />
                Over
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-emerald-400/80" />
                Under
              </span>
            </div>
          </div>

          <p className="mt-2 text-[10px] text-zinc-600 sm:hidden">
            Swipe horizontally to view all 48 settlement periods.
          </p>

          <div className="mt-4 overflow-x-auto pb-1">
            <div className="min-w-[820px]">
              <div
                className="grid items-center gap-1"
                style={{
                  gridTemplateColumns: "34px repeat(48, minmax(0, 1fr))",
                }}
              >
                <span />
                {Array.from({ length: 48 }, (_, index) => {
                  const period = index + 1;
                  return (
                    <span
                      key={period}
                      className="text-center text-[8px] tabular-nums text-zinc-600"
                    >
                      {period === 1 || period % 4 === 0 ? period : ""}
                    </span>
                  );
                })}
              </div>

              {analysis.dates.map((date) => (
                <div
                  key={date}
                  className="mt-1 grid items-center gap-1"
                  style={{
                    gridTemplateColumns: "34px repeat(48, minmax(0, 1fr))",
                  }}
                >
                  <span className="text-[9px] tabular-nums text-zinc-600">
                    {date.slice(8, 10)}
                  </span>
                  {Array.from({ length: 48 }, (_, index) => {
                    const period = index + 1;
                    const value = analysis.matrix.get(date)?.get(period) ?? null;
                    return (
                      <span
                        key={period}
                        title={`${formatDate(`${date}T00:00:00Z`)} · SP ${period} · ${
                          value == null
                            ? "No data"
                            : `${value > 0 ? "+" : ""}${formatNumber(value)} MW`
                        }`}
                        className="h-3.5 rounded-[2px] transition-transform hover:scale-125"
                        style={{
                          backgroundColor: cellColor(value, analysis.maxAbs),
                        }}
                      />
                    );
                  })}
                </div>
              ))}

              <div
                className="mt-2 grid items-center gap-1"
                style={{
                  gridTemplateColumns: "34px repeat(48, minmax(0, 1fr))",
                }}
              >
                <span />
                {Array.from({ length: 48 }, (_, index) => (
                  <span
                    key={index}
                    className="text-center text-[8px] tabular-nums text-zinc-600"
                  >
                    {index === 47 ? 48 : ""}
                  </span>
                ))}
              </div>
              <p className="mt-1 pl-[38px] text-[9px] text-zinc-600">
                Settlement period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
