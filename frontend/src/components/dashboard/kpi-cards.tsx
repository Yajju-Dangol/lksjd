"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  Info,
  Minus,
  Scale,
  TriangleAlert,
  Waves,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDeltaPct, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MetricsResponse } from "@/types/api";

interface KpiCardsProps {
  metrics: MetricsResponse | null;
  latestMetrics: MetricsResponse | null;
  loading: boolean;
}

type Signal = "positive" | "negative" | "neutral";

interface KpiItem {
  label: string;
  value: string;
  unit: "MW" | "%";
  suffix: "%" | "pp";
  delta: number | null;
  tooltip: string;
  icon: LucideIcon;
  signal: Signal;
}

function relativeDelta(current: number, baseline: number): number {
  if (!Number.isFinite(baseline) || baseline === 0) return 0;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

/** All four KPIs are "lower is better", so a negative delta is an improvement. */
function signalFromDelta(delta: number): Signal {
  if (Math.abs(delta) < 0.05) return "neutral";
  return delta < 0 ? "positive" : "negative";
}

function buildItems(
  metrics: MetricsResponse,
  baseline: MetricsResponse,
): KpiItem[] {
  return [
    {
      label: "MAE",
      value: formatNumber(metrics.mae_mw),
      unit: "MW",
      suffix: "%",
      delta: relativeDelta(metrics.mae_mw, baseline.mae_mw),
      tooltip:
        "Mean absolute error: mean of |forecast − actual| across aligned 30-minute periods. Compared with the latest forecast vintage for the same window.",
      icon: Gauge,
      signal: signalFromDelta(relativeDelta(metrics.mae_mw, baseline.mae_mw)),
    },
    {
      label: "RMSE",
      value: formatNumber(metrics.rmse_mw),
      unit: "MW",
      suffix: "%",
      delta: relativeDelta(metrics.rmse_mw, baseline.rmse_mw),
      tooltip:
        "Root mean squared error: square root of the mean squared miss. Large deviations dominate this figure, making it a proxy for imbalance risk.",
      icon: Waves,
      signal: signalFromDelta(relativeDelta(metrics.rmse_mw, baseline.rmse_mw)),
    },
    {
      label: "Peak error",
      value: formatNumber(metrics.max_error_mw),
      unit: "MW",
      suffix: "%",
      delta: relativeDelta(metrics.max_error_mw, baseline.max_error_mw),
      tooltip:
        "Worst single settlement period in the selected window. Use this to size worst-case reserve procurement.",
      icon: TriangleAlert,
      signal: signalFromDelta(
        relativeDelta(metrics.max_error_mw, baseline.max_error_mw),
      ),
    },
    {
      label: "Over-forecast",
      value: formatNumber(metrics.over_forecast_pct, 1),
      unit: "%",
      suffix: "pp",
      delta: metrics.over_forecast_pct - baseline.over_forecast_pct,
      tooltip:
        "Percentage of periods where the day-ahead forecast exceeded metered wind. A lower ratio reduces exposure to expensive thermal backup.",
      icon: Scale,
      signal: signalFromDelta(
        metrics.over_forecast_pct - baseline.over_forecast_pct,
      ),
    },
  ];
}

function DeltaBadge({ item }: { item: KpiItem }) {
  const Icon =
    item.signal === "positive"
      ? ArrowDownRight
      : item.signal === "negative"
        ? ArrowUpRight
        : Minus;

  return (
    <Badge
      variant="outline"
      title="Change vs latest forecast vintage for the same window"
      className={cn(
        "h-5 gap-1 border px-1.5 text-[10px] font-medium tabular-nums",
        item.signal === "positive" &&
          "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
        item.signal === "negative" &&
          "border-rose-500/25 bg-rose-500/10 text-rose-400",
        item.signal === "neutral" &&
          "border-zinc-800 bg-zinc-900/50 text-zinc-500",
      )}
    >
      <Icon aria-hidden className="size-3" />
      {item.delta == null ? "—" : formatDeltaPct(item.delta, item.suffix)}
    </Badge>
  );
}

function KpiCard({ item }: { item: KpiItem }) {
  return (
    <Card className="group relative gap-0 overflow-hidden border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0 transition-all duration-300 hover:border-zinc-700/80 hover:shadow-[0_0_44px_-20px_rgba(255,255,255,0.22)]">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-zinc-600/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-1.5">
            <item.icon
              aria-hidden
              className="mt-0.5 size-3.5 shrink-0 text-zinc-500"
            />
            <span className="text-[10px] font-medium uppercase leading-4 tracking-[0.08em] text-zinc-500">
              {item.label}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`About ${item.label}`}
                  className="mt-0.5 shrink-0 text-zinc-600 transition-colors hover:text-zinc-400"
                >
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px] border border-zinc-700/60 bg-zinc-900 leading-5 text-zinc-300">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          </div>
          <DeltaBadge item={item} />
        </div>

        <p className="flex items-baseline gap-1.5 text-[26px] font-semibold leading-none tracking-tight text-zinc-50 tabular-nums">
          {item.value}
          <span className="text-[10px] font-normal uppercase tracking-wide text-zinc-600">
            {item.unit}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}

function KpiSkeleton() {
  return (
    <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
      <CardContent className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20 bg-zinc-800/80" />
          <Skeleton className="h-5 w-14 rounded-full bg-zinc-800/80" />
        </div>
        <Skeleton className="h-7 w-24 bg-zinc-800/80" />
      </CardContent>
    </Card>
  );
}

export function KpiCards({ metrics, latestMetrics, loading }: KpiCardsProps) {
  if (loading && !metrics) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiSkeleton key={index} />
        ))}
      </div>
    );
  }

  const baseline = latestMetrics ?? metrics;
  const items =
    metrics && baseline ? buildItems(metrics, baseline) : null;

  if (!items) {
    const placeholders: KpiItem[] = [
      {
        label: "MAE",
        value: "—",
        unit: "MW",
        suffix: "%",
        delta: null,
        tooltip: "Waiting for the API.",
        icon: Gauge,
        signal: "neutral",
      },
      {
        label: "RMSE",
        value: "—",
        unit: "MW",
        suffix: "%",
        delta: null,
        tooltip: "Waiting for the API.",
        icon: Waves,
        signal: "neutral",
      },
      {
        label: "Peak error",
        value: "—",
        unit: "MW",
        suffix: "%",
        delta: null,
        tooltip: "Waiting for the API.",
        icon: TriangleAlert,
        signal: "neutral",
      },
      {
        label: "Over-forecast",
        value: "—",
        unit: "%",
        suffix: "pp",
        delta: null,
        tooltip: "Waiting for the API.",
        icon: Scale,
        signal: "neutral",
      },
    ];
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {placeholders.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}
