"use client";

import { useMemo } from "react";
import type { TooltipContentProps } from "recharts";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartNoAxesCombined,
  Download,
  FileJson,
  FileSpreadsheet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  downloadCsv,
  downloadJson,
  formatChartTick,
  formatNumber,
  formatSignedMW,
  formatSignedTwh,
  formatTooltipStamp,
  formatTwh,
} from "@/lib/format";
import {
  RANGE_PRESETS,
  RESOLUTIONS,
  rangeSpanDays,
  type RangeKey,
  type RangePreset,
  type Resolution,
} from "@/lib/ranges";
import { cn } from "@/lib/utils";
import type {
  GenerationDataPoint,
  GenerationDataResponse,
} from "@/types/api";

interface ForecastChartProps {
  data: GenerationDataResponse | null;
  loading: boolean;
  range: RangePreset;
  resolution: Resolution;
  onRangeChange: (key: RangeKey) => void;
  onResolutionChange: (resolution: Resolution) => void;
}

interface ChartPoint {
  startTime: string;
  actual_mw: number | null;
  forecast_mw: number | null;
  error_mw: number | null;
}

const BUCKET_MS: Record<Exclude<Resolution, "30m">, number> = {
  "1h": 3_600_000,
  "3h": 10_800_000,
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildChartData(
  points: GenerationDataPoint[],
  resolution: Resolution,
): ChartPoint[] {
  if (resolution === "30m") {
    return points.map((point) => ({
      startTime: point.startTime,
      actual_mw: point.actual_mw,
      forecast_mw: point.forecast_mw,
      error_mw: point.error_mw,
    }));
  }

  const bucketSize = BUCKET_MS[resolution];
  const buckets = new Map<
    number,
    { actual: number[]; forecast: number[]; error: number[] }
  >();

  for (const point of points) {
    const timestamp = new Date(point.startTime).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;
    const bucket = buckets.get(bucketKey) ?? {
      actual: [],
      forecast: [],
      error: [],
    };
    if (point.actual_mw != null) bucket.actual.push(point.actual_mw);
    if (point.forecast_mw != null) bucket.forecast.push(point.forecast_mw);
    if (point.error_mw != null) bucket.error.push(point.error_mw);
    buckets.set(bucketKey, bucket);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, bucket]) => ({
      startTime: new Date(timestamp).toISOString(),
      actual_mw: average(bucket.actual),
      forecast_mw: average(bucket.forecast),
      error_mw: average(bucket.error),
    }));
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as ChartPoint | undefined;
  if (!active || !point) return null;

  const errorTone =
    point.error_mw == null
      ? "text-zinc-400"
      : point.error_mw > 0
        ? "text-rose-400"
        : "text-emerald-400";

  return (
    <div className="min-w-[224px] rounded-2xl border border-zinc-700/60 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <span className="inline-flex rounded-full border border-zinc-700/60 bg-zinc-950/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        {formatTooltipStamp(point.startTime)}
      </span>
      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="size-1.5 rounded-full bg-zinc-100" />
            Actual
          </span>
          <span className="font-medium tabular-nums text-zinc-100">
            {point.actual_mw == null
              ? "—"
              : `${formatNumber(point.actual_mw)} MW`}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Forecast
          </span>
          <span className="font-medium tabular-nums text-zinc-100">
            {point.forecast_mw == null
              ? "—"
              : `${formatNumber(point.forecast_mw)} MW`}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-zinc-800/80 pt-2">
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">
          Delta error
        </span>
        <span className={cn("text-xs font-medium tabular-nums", errorTone)}>
          {formatSignedMW(point.error_mw)}
        </span>
      </div>
    </div>
  );
}

function EmptyChart({ hasError }: { hasError: boolean }) {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-800/80 bg-zinc-950/40 text-center sm:h-[340px]">
      <ChartNoAxesCombined className="size-6 text-zinc-700" />
      <p className="text-xs font-medium text-zinc-400">
        {hasError ? "Chart unavailable" : "No generation data in this window"}
      </p>
      <p className="max-w-[280px] text-[11px] leading-4 text-zinc-600">
        {hasError
          ? "Start the FastAPI service and refresh to load January 2026 wind data."
          : "Try widening the date range or switching back to the full month."}
      </p>
    </div>
  );
}

export function ForecastChart({
  data,
  loading,
  range,
  resolution,
  onRangeChange,
  onResolutionChange,
}: ForecastChartProps) {
  const points = useMemo(() => data?.points ?? [], [data]);
  const spanDays = rangeSpanDays(range);

  const chartData = useMemo(
    () => buildChartData(points, resolution),
    [points, resolution],
  );

  const { actualTwh, forecastTwh } = useMemo(() => {
    let actualMwh = 0;
    let forecastMwh = 0;
    for (const point of points) {
      if (point.actual_mw != null) actualMwh += point.actual_mw * 0.5;
      if (point.forecast_mw != null) forecastMwh += point.forecast_mw * 0.5;
    }
    return {
      actualTwh: actualMwh / 1_000_000,
      forecastTwh: forecastMwh / 1_000_000,
    };
  }, [points]);

  const showSkeleton = loading && !data;
  const showEmpty = !showSkeleton && chartData.length === 0;

  function handleExport(format: "csv" | "json") {
    if (points.length === 0) return;
    const base = `windscope-jan2026-${range.key}`;
    if (format === "csv") {
      downloadCsv(
        points.map((point) => ({
          startTime: point.startTime,
          publishTime: point.publishTime,
          actual_mw: point.actual_mw,
          forecast_mw: point.forecast_mw,
          error_mw: point.error_mw,
        })),
        `${base}.csv`,
      );
      return;
    }
    downloadJson(
      {
        range: { start: range.start, end: range.end },
        count: data?.count ?? points.length,
        snapshot: data?.snapshot ?? null,
        source: data?.source ?? null,
        points,
      },
      `${base}.json`,
    );
  }

  return (
    <Card className="gap-0 overflow-hidden border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
      <CardContent className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-medium tracking-tight text-zinc-200">
                Generation vs day-ahead forecast
              </h2>
              <Badge
                variant="outline"
                className="h-5 border-zinc-800 bg-zinc-900/50 text-[10px] font-normal text-zinc-500"
              >
                {range.label}
              </Badge>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              30-minute settlement periods · GB national wind fleet · UTC
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-3xl font-semibold tracking-tight text-zinc-50 tabular-nums">
                {showSkeleton || !data ? "—" : formatTwh(actualTwh)}
              </span>
              <span className="pb-1 text-[11px] text-zinc-500">
                metered wind generated
              </span>
            </div>
            <p className="mt-1.5 text-[11px] tabular-nums text-zinc-600">
              Day-ahead forecast total{" "}
              <span className="text-zinc-400">
                {showSkeleton || !data ? "—" : formatTwh(forecastTwh)}
              </span>
              {!showSkeleton && data ? (
                <>
                  {" "}
                  ·{" "}
                  <span
                    className={
                      forecastTwh >= actualTwh
                        ? "text-rose-400/80"
                        : "text-emerald-400/80"
                    }
                  >
                    {formatSignedTwh(forecastTwh - actualTwh)}
                  </span>{" "}
                  net
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={resolution}
              onValueChange={(value) =>
                onResolutionChange(value as Resolution)
              }
            >
              <SelectTrigger
                size="sm"
                aria-label="Chart resolution"
                className="h-8 w-[128px] border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-300">
                {RESOLUTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="border-zinc-800 bg-zinc-950 text-zinc-300"
              >
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  <FileSpreadsheet className="size-3.5 text-zinc-500" />
                  Download CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>
                  <FileJson className="size-3.5 text-zinc-500" />
                  Download JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex w-fit items-center gap-1 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-1"
            role="group"
            aria-label="Date range presets"
          >
            {RANGE_PRESETS.map((preset) => {
              const active = preset.key === range.key;
              return (
                <Button
                  key={preset.key}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={active}
                  onClick={() => onRangeChange(preset.key)}
                  className={cn(
                    "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                      : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100",
                  )}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full bg-zinc-100" />
              Actual
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-5 rounded-full border-t border-dashed border-emerald-400" />
              Day-ahead forecast
            </span>
          </div>
        </div>

        <div
          className={cn(
            "mt-3 transition-opacity duration-300",
            loading && data ? "opacity-60" : "opacity-100",
          )}
        >
          {showSkeleton ? (
            <Skeleton className="h-[300px] w-full rounded-xl bg-zinc-900/60 sm:h-[340px]" />
          ) : showEmpty ? (
            <EmptyChart hasError={!data} />
          ) : (
            <div className="h-[300px] w-full sm:h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="actual-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#fafafa"
                        stopOpacity={0.16}
                      />
                      <stop
                        offset="100%"
                        stopColor="#fafafa"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#27272a"
                    strokeDasharray="3 3"
                    strokeOpacity={0.65}
                  />
                  <XAxis
                    dataKey="startTime"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={52}
                    dy={8}
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(value: string) =>
                      formatChartTick(value, spanDays)
                    }
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    tickFormatter={(value: number) =>
                      value >= 1000
                        ? `${Math.round(value / 1000)}k`
                        : `${value}`
                    }
                  />
                  <Tooltip
                    cursor={{
                      stroke: "#3f3f46",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                    content={(props) => <ChartTooltip {...props} />}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual_mw"
                    name="Actual"
                    stroke="#fafafa"
                    strokeWidth={1.6}
                    fill="url(#actual-fill)"
                    dot={false}
                    activeDot={{
                      r: 3,
                      fill: "#fafafa",
                      stroke: "#09090b",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast_mw"
                    name="Day-ahead forecast"
                    stroke="#34d399"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{
                      r: 3,
                      fill: "#34d399",
                      stroke: "#09090b",
                      strokeWidth: 2,
                    }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-3 text-[10px] text-zinc-600">
          <span>
            {range.start} → {range.end} · gate closure 11:00 UTC D-1
          </span>
          <span className="tabular-nums">
            {formatNumber(chartData.length)} plotted points ·{" "}
            {RESOLUTIONS.find((option) => option.value === resolution)?.label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
