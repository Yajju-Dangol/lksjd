"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { History, RadioTower, Timer } from "lucide-react";

import { ViewError } from "@/components/views/view-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWindDashboard } from "@/hooks/use-wind-dashboard";
import {
  formatDateTime,
  formatNumber,
  formatPeriod,
  median,
} from "@/lib/format";
import { DATASET_END, DATASET_START } from "@/lib/ranges";
import { cn } from "@/lib/utils";
import type { GenerationDataPoint } from "@/types/api";

interface VintageRow {
  publishTime: string;
  periods: number;
  medianLead: number;
  mae: number;
  peak: number;
  overPct: number;
}

function leadHours(point: GenerationDataPoint): number | null {
  if (!point.publishTime) return null;
  const publish = new Date(point.publishTime).getTime();
  const delivery = new Date(point.startTime).getTime();
  if (!Number.isFinite(publish) || !Number.isFinite(delivery)) return null;
  return (delivery - publish) / 3_600_000;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildVintages(points: GenerationDataPoint[]): VintageRow[] {
  const groups = new Map<string, GenerationDataPoint[]>();

  for (const point of points) {
    if (!point.publishTime || point.error_mw == null) continue;
    const group = groups.get(point.publishTime) ?? [];
    group.push(point);
    groups.set(point.publishTime, group);
  }

  return [...groups.entries()]
    .map(([publishTime, group]) => {
      const leads = group
        .map(leadHours)
        .filter((value): value is number => value != null);
      const errors = group.map((point) => Math.abs(point.error_mw ?? 0));
      const over = group.filter((point) => (point.error_mw ?? 0) > 0).length;

      return {
        publishTime,
        periods: group.length,
        medianLead: leads.length > 0 ? median(leads) : 0,
        mae: mean(errors),
        peak: Math.max(...errors),
        overPct: (over / group.length) * 100,
      };
    })
    .sort((left, right) => right.publishTime.localeCompare(left.publishTime));
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
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
      </CardContent>
    </Card>
  );
}

export function HistoricalForecastsView({
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
  const [selectedVintage, setSelectedVintage] = useState<string | null>(null);

  const points = useMemo(
    () => data?.generation.points ?? [],
    [data],
  );
  const vintages = useMemo(() => buildVintages(points), [points]);
  const activeVintage =
    selectedVintage && vintages.some((row) => row.publishTime === selectedVintage)
      ? selectedVintage
      : vintages[0]?.publishTime ?? null;
  const active = vintages.find((row) => row.publishTime === activeVintage) ?? null;

  const overall = useMemo(() => {
    const leads = points
      .map(leadHours)
      .filter((value): value is number => value != null);
    const errors = points
      .map((point) => point.error_mw)
      .filter((value): value is number => value != null)
      .map(Math.abs);

    return {
      medianLead: leads.length > 0 ? median(leads) : null,
      mae: errors.length > 0 ? mean(errors) : null,
    };
  }, [points]);

  const selectedPoints = useMemo(
    () =>
      points
        .filter((point) => point.publishTime === activeVintage)
        .sort((left, right) => left.startTime.localeCompare(right.startTime)),
    [activeVintage, points],
  );

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[74px] bg-zinc-900/70" />
          ))}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-[420px] bg-zinc-900/70" />
          <Skeleton className="h-[420px] bg-zinc-900/70" />
        </div>
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
          label="Vintages"
          value={formatNumber(vintages.length)}
          icon={RadioTower}
        />
        <StatCard
          label="Median lead"
          value={
            overall.medianLead == null
              ? "—"
              : `${formatNumber(overall.medianLead, 1)} h`
          }
          icon={Timer}
        />
        <StatCard
          label="Month MAE"
          value={overall.mae == null ? "—" : `${formatNumber(overall.mae)} MW`}
          icon={History}
        />
      </div>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
          <CardContent className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium tracking-tight text-zinc-200">
                Forecast vintages
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Day-ahead snapshot · publishTime vs startTime
              </p>
              <Select
                value={activeVintage ?? undefined}
                onValueChange={setSelectedVintage}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Forecast publication vintage"
                  className="h-8 w-[190px] border-zinc-800 bg-zinc-900/40 text-xs text-zinc-300"
                >
                  <SelectValue placeholder="Select vintage" />
                </SelectTrigger>
                <SelectContent className="max-h-[320px] border-zinc-800 bg-zinc-950 text-zinc-300">
                  {vintages.map((vintage) => (
                    <SelectItem
                      key={vintage.publishTime}
                      value={vintage.publishTime}
                    >
                      {formatDateTime(vintage.publishTime)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 max-h-[390px] overflow-auto pr-1">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-[#0c0c0e]">
                  <TableRow className="border-zinc-800/60 hover:bg-transparent">
                    <TableHead className="h-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Published
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Periods
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Lead
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      MAE
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Peak
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vintages.map((vintage) => {
                    const isActive = vintage.publishTime === activeVintage;
                    return (
                      <TableRow
                        key={vintage.publishTime}
                        onClick={() => setSelectedVintage(vintage.publishTime)}
                        className={cn(
                          "cursor-pointer border-zinc-800/40 hover:bg-zinc-900/40",
                          isActive && "bg-emerald-500/[0.06]",
                        )}
                      >
                        <TableCell className="py-2 text-[11px] tabular-nums text-zinc-400">
                          {formatDateTime(vintage.publishTime)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-500">
                          {formatNumber(vintage.periods)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-500">
                          {formatNumber(vintage.medianLead, 1)} h
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-200">
                          {formatNumber(vintage.mae)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-rose-400/90">
                          {formatNumber(vintage.peak)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
          <CardContent className="px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium tracking-tight text-zinc-200">
                  Selected vintage
                </h2>
                <p className="mt-0.5 text-[11px] tabular-nums text-zinc-500">
                  {active ? formatDateTime(active.publishTime) : "—"}
                </p>
              </div>
              <Badge
                variant="outline"
                className="h-5 border-zinc-800 bg-zinc-900/50 text-[10px] font-normal tabular-nums text-zinc-500"
              >
                {active ? `${formatNumber(active.periods)} periods` : "—"}
              </Badge>
            </div>

            <div className="mt-3 max-h-[390px] overflow-auto pr-1">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-[#0c0c0e]">
                  <TableRow className="border-zinc-800/60 hover:bg-transparent">
                    <TableHead className="h-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Period
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Lead
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Actual
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Forecast
                    </TableHead>
                    <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                      Error
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPoints.map((point) => {
                    const lead = leadHours(point);
                    return (
                      <TableRow
                        key={point.startTime}
                        className="border-zinc-800/40 hover:bg-zinc-900/40"
                      >
                        <TableCell className="py-2 text-[11px] tabular-nums text-zinc-400">
                          {formatPeriod(point.startTime)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-500">
                          {lead == null ? "—" : `${formatNumber(lead, 1)} h`}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-200">
                          {formatNumber(point.actual_mw ?? 0)}
                        </TableCell>
                        <TableCell className="py-2 text-right text-[11px] tabular-nums text-emerald-400/90">
                          {formatNumber(point.forecast_mw ?? 0)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-2 text-right text-[11px] font-medium tabular-nums",
                            (point.error_mw ?? 0) > 0
                              ? "text-rose-400"
                              : "text-sky-400",
                          )}
                        >
                          {formatNumber(point.error_mw ?? 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
