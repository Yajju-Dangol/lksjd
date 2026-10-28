"use client";

import { useMemo, useState } from "react";
import { BadgePoundSterling, Flame, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatGBP, formatNumber, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GenerationDataPoint, MetricsResponse } from "@/types/api";

interface ThermalEstimatorProps {
  points: GenerationDataPoint[];
  metrics: MetricsResponse | null;
  loading: boolean;
}

const PRICE_PRESETS = [80, 120, 200, 350];

export function ThermalEstimator({
  points,
  metrics,
  loading,
}: ThermalEstimatorProps) {
  const [price, setPrice] = useState(120);

  const stats = useMemo(() => {
    const errors = points
      .map((point) => point.error_mw)
      .filter((value): value is number => value != null)
      .map((value) => Math.abs(value));

    if (errors.length === 0) {
      return {
        periods: 0,
        errorEnergyMwh: 0,
        meanAbsMw: 0,
        worstMw: 0,
      };
    }

    const totalAbsMw = errors.reduce((sum, value) => sum + value, 0);

    return {
      periods: errors.length,
      errorEnergyMwh: totalAbsMw * 0.5,
      meanAbsMw: totalAbsMw / errors.length,
      worstMw: Math.max(...errors),
    };
  }, [points]);

  const totalCost = stats.errorEnergyMwh * price;
  const perPeriod = stats.periods > 0 ? totalCost / stats.periods : 0;
  const worstCost = stats.worstMw * 0.5 * price;
  const showSkeleton = loading && points.length === 0;

  return (
    <Card className="relative gap-0 overflow-hidden border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
      <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-emerald-500/[0.07] blur-3xl" />
      <CardContent className="relative flex flex-col gap-5 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium tracking-tight text-zinc-200">
              Thermal backup cost estimator
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-zinc-500">
              Convert MW forecast miss into day-ahead imbalance exposure.
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-5 shrink-0 border-emerald-500/20 bg-emerald-500/10 text-[10px] font-normal text-emerald-400"
          >
            <Flame className="size-2.5" />
            £/MWh
          </Badge>
        </div>

        {showSkeleton ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full bg-zinc-900/70" />
            <Skeleton className="h-4 w-full bg-zinc-900/70" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 bg-zinc-900/70" />
              <Skeleton className="h-16 bg-zinc-900/70" />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-600">
                  Total imbalance exposure
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="How exposure is calculated"
                        className="text-zinc-600 transition-colors hover:text-zinc-400"
                      >
                        <Info className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] border border-zinc-700/60 bg-zinc-900 leading-5 text-zinc-300">
                      Σ|forecast − actual| × 0.5 hours × thermal price. This
                      estimates the cost of covering forecast error with
                      gas-fired backup.
                    </TooltipContent>
                  </Tooltip>
                </p>
                <p className="mt-2 text-[32px] font-semibold leading-none tracking-tight text-zinc-50 tabular-nums">
                  {stats.periods === 0 ? "—" : formatGBP(totalCost)}
                </p>
                <p className="mt-1.5 text-[10px] tabular-nums text-zinc-600">
                  at £{formatNumber(price)}/MWh ·{" "}
                  {stats.periods === 0
                    ? "—"
                    : `${formatNumber(stats.errorEnergyMwh)} MWh of error energy`}
                </p>
              </div>
              <div className="rounded-full border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-[11px] font-medium tabular-nums text-zinc-300">
                £{formatNumber(price)}
                <span className="text-zinc-600">/MWh</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-zinc-600">
                <span>£20</span>
                <span className="uppercase tracking-wide">
                  Thermal backup price
                </span>
                <span>£500</span>
              </div>
              <Slider
                min={20}
                max={500}
                step={5}
                value={[price]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next != null) setPrice(next);
                }}
                aria-label="Thermal backup price in pounds per megawatt hour"
                className={cn(
                  "[&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-zinc-800",
                  "[&_[data-slot=slider-range]]:bg-emerald-500",
                  "[&_[data-slot=slider-thumb]]:size-4 [&_[data-slot=slider-thumb]]:border-emerald-400 [&_[data-slot=slider-thumb]]:bg-zinc-950",
                  "[&_[data-slot=slider-thumb]]:shadow-[0_0_0_4px_rgba(52,211,153,0.14)]",
                )}
              />
              <div className="flex flex-wrap gap-1.5">
                {PRICE_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPrice(preset)}
                    className={cn(
                      "h-6 rounded-full border-zinc-800 bg-zinc-900/40 px-2.5 text-[10px] tabular-nums text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                      price === preset &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300",
                    )}
                  >
                    £{preset}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                  Per settlement period
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-zinc-200">
                  {stats.periods === 0 ? "—" : formatGBP(perPeriod)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-600">
                  Worst 30-min period
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-rose-400">
                  {stats.periods === 0 ? "—" : formatGBP(worstCost)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1.5">
                <BadgePoundSterling className="size-3" />
                {formatNumber(stats.periods)} periods
              </span>
              {metrics ? (
                <span className="tabular-nums">
                  <span className="text-rose-400/90">
                    {formatPct(metrics.over_forecast_pct, 1)}
                  </span>{" "}
                  over ·{" "}
                  <span className="text-emerald-400/90">
                    {formatPct(metrics.under_forecast_pct, 1)}
                  </span>{" "}
                  under
                </span>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
