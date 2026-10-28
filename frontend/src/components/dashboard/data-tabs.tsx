"use client";

import { useMemo } from "react";
import {
  Activity,
  Clock3,
  RadioTower,
  Table2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { formatNumber, formatPeriod, median } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GenerationDataPoint } from "@/types/api";

interface DataTabsProps {
  points: GenerationDataPoint[];
  loading: boolean;
}

function SignalBadge({ error }: { error: number | null }) {
  if (error == null) {
    return (
      <Badge
        variant="outline"
        className="h-5 border-zinc-800 bg-zinc-900/50 text-[10px] font-normal text-zinc-500"
      >
        No data
      </Badge>
    );
  }

  if (Math.abs(error) < 1) {
    return (
      <Badge
        variant="outline"
        className="h-5 border-zinc-800 bg-zinc-900/50 text-[10px] font-normal text-zinc-500"
      >
        Balanced
      </Badge>
    );
  }

  const over = error > 0;
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 text-[10px] font-medium tabular-nums",
        over
          ? "border-rose-500/25 bg-rose-500/10 text-rose-400"
          : "border-sky-500/25 bg-sky-500/10 text-sky-400",
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {over ? "Over" : "Under"} {formatNumber(Math.abs(error))}
    </Badge>
  );
}

function EmptyRows({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/40 px-4 text-center">
      <Table2 className="size-5 text-zinc-700" />
      <p className="text-xs text-zinc-500">{message}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 pt-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full bg-zinc-900/70" />
      ))}
    </div>
  );
}

function PeriodTable({
  points,
  loading,
}: {
  points: GenerationDataPoint[];
  loading: boolean;
}) {
  const latest = useMemo(
    () => points.filter((point) => point.error_mw != null).slice(-24).reverse(),
    [points],
  );

  if (loading && points.length === 0) return <TableSkeleton />;
  if (latest.length === 0) {
    return <EmptyRows message="No aligned settlement periods for this range." />;
  }

  return (
    <div>
      <div className="max-h-[318px] overflow-auto pr-1">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#0c0c0e]">
            <TableRow className="border-zinc-800/60 hover:bg-transparent">
              <TableHead className="h-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Settlement period
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Actual
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Forecast
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Δ Error
              </TableHead>
              <TableHead className="hidden h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600 md:table-cell">
                Signal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {latest.map((point) => (
              <TableRow
                key={point.startTime}
                className="border-zinc-800/40 hover:bg-zinc-900/40"
              >
                <TableCell className="py-2 text-[11px] tabular-nums text-zinc-400">
                  {formatPeriod(point.startTime)}
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
                <TableCell className="hidden py-2 text-right md:table-cell">
                  <SignalBadge error={point.error_mw} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-[10px] tabular-nums text-zinc-600">
        Showing latest {formatNumber(latest.length)} of{" "}
        {formatNumber(points.length)} aligned periods · MW
      </p>
    </div>
  );
}

function HighErrorTable({
  points,
  loading,
}: {
  points: GenerationDataPoint[];
  loading: boolean;
}) {
  const events = useMemo(
    () =>
      [...points]
        .filter((point) => point.error_mw != null)
        .sort(
          (left, right) =>
            Math.abs(right.error_mw ?? 0) - Math.abs(left.error_mw ?? 0),
        )
        .slice(0, 12),
    [points],
  );

  if (loading && points.length === 0) return <TableSkeleton />;
  if (events.length === 0) {
    return <EmptyRows message="No forecast errors available in this range." />;
  }

  return (
    <div>
      <div className="max-h-[318px] overflow-auto pr-1">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-[#0c0c0e]">
            <TableRow className="border-zinc-800/60 hover:bg-transparent">
              <TableHead className="h-8 w-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                #
              </TableHead>
              <TableHead className="h-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Period
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Forecast
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                Actual
              </TableHead>
              <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                |Error|
              </TableHead>
              <TableHead className="hidden h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600 md:table-cell">
                Signal
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((point, index) => (
              <TableRow
                key={point.startTime}
                className="border-zinc-800/40 hover:bg-zinc-900/40"
              >
                <TableCell className="py-2 text-[11px] tabular-nums text-zinc-600">
                  {String(index + 1).padStart(2, "0")}
                </TableCell>
                <TableCell className="py-2 text-[11px] tabular-nums text-zinc-400">
                  {formatPeriod(point.startTime)}
                </TableCell>
                <TableCell className="py-2 text-right text-[11px] tabular-nums text-emerald-400/90">
                  {formatNumber(point.forecast_mw ?? 0)}
                </TableCell>
                <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-200">
                  {formatNumber(point.actual_mw ?? 0)}
                </TableCell>
                <TableCell className="py-2 text-right text-[11px] font-medium tabular-nums text-rose-400">
                  {formatNumber(Math.abs(point.error_mw ?? 0))}
                </TableCell>
                <TableCell className="hidden py-2 text-right md:table-cell">
                  <SignalBadge error={point.error_mw} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">
        Ranked by absolute day-ahead forecast miss · top 12 events · MW
      </p>
    </div>
  );
}

function LeadTimeAnalysis({
  points,
  loading,
}: {
  points: GenerationDataPoint[];
  loading: boolean;
}) {
  const analysis = useMemo(() => {
    const leadHours = points
      .filter((point) => point.publishTime != null)
      .map((point) => {
        const publish = new Date(point.publishTime as string).getTime();
        const delivery = new Date(point.startTime).getTime();
        return (delivery - publish) / 3_600_000;
      })
      .filter((hours) => Number.isFinite(hours) && hours >= 0);

    const vintages = new Set(
      points
        .map((point) => point.publishTime)
        .filter((value): value is string => value != null),
    ).size;

    const bucketDefs = [
      { label: "12–18h", min: 12, max: 18 },
      { label: "18–24h", min: 18, max: 24 },
      { label: "24–30h", min: 24, max: 30 },
      { label: "30–36h", min: 30, max: 36 },
      { label: "36–42h", min: 36, max: 42 },
    ];
    const buckets = bucketDefs.map((bucket) => ({
      ...bucket,
      count: leadHours.filter(
        (hours) => hours >= bucket.min && hours < bucket.max,
      ).length,
    }));
    const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);

    return {
      count: leadHours.length,
      median: leadHours.length > 0 ? median(leadHours) : null,
      min: leadHours.length > 0 ? Math.min(...leadHours) : null,
      max: leadHours.length > 0 ? Math.max(...leadHours) : null,
      vintages,
      buckets,
      maxCount,
    };
  }, [points]);

  if (loading && points.length === 0) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 bg-zinc-900/70" />
        <Skeleton className="h-24 bg-zinc-900/70" />
        <Skeleton className="h-40 bg-zinc-900/70 sm:col-span-2" />
      </div>
    );
  }

  if (analysis.count === 0) {
    return (
      <EmptyRows message="No publish timestamps available for lead-time analysis." />
    );
  }

  const summary = [
    {
      label: "Median lead time",
      value: `${formatNumber(analysis.median ?? 0, 1)} h`,
      icon: Clock3,
    },
    {
      label: "Forecast vintage",
      value: `${analysis.vintages} publish batch${analysis.vintages === 1 ? "" : "es"}`,
      icon: RadioTower,
    },
    {
      label: "Lead-time span",
      value: `${formatNumber(analysis.min ?? 0, 1)}–${formatNumber(analysis.max ?? 0, 1)} h`,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4 pt-1">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {summary.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5"
          >
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-zinc-600">
              <item.icon className="size-3" />
              {item.label}
            </p>
            <p className="mt-1.5 text-sm font-medium tabular-nums text-zinc-200">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/20 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-medium text-zinc-400">
            Lead-time distribution
          </p>
          <span className="text-[10px] tabular-nums text-zinc-600">
            {formatNumber(analysis.count)} periods
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {analysis.buckets.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-[10px] tabular-nums text-zinc-600">
                {bucket.label}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-emerald-400"
                  style={{
                    width: `${(bucket.count / analysis.maxCount) * 100}%`,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-zinc-500">
                {bucket.count}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-4 text-zinc-600">
          Only forecasts published before 11:00 UTC on D-1 are eligible.
          Vertical selection picks the latest compliant vintage for each
          settlement period.
        </p>
      </div>
    </div>
  );
}

export function DataTabs({ points, loading }: DataTabsProps) {
  return (
    <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
      <CardContent className="px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium tracking-tight text-zinc-200">
              Settlement intelligence
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              Period-level evidence behind the headline metrics
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-5 border-zinc-800 bg-zinc-900/50 text-[10px] font-normal text-zinc-500"
          >
            Day-ahead snapshot
          </Badge>
        </div>

        <Tabs defaultValue="periods" className="mt-4">
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-5 overflow-x-auto border-b border-zinc-800/60 p-0"
          >
            <TabsTrigger
              value="periods"
              className="h-8 flex-none rounded-none px-0 pb-2 text-[11px] font-medium text-zinc-500 data-active:text-zinc-100"
            >
              <Table2 className="size-3.5" />
              <span className="sm:hidden">Periods</span>
              <span className="hidden sm:inline">Settlement Period Details</span>
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="h-8 flex-none rounded-none px-0 pb-2 text-[11px] font-medium text-zinc-500 data-active:text-zinc-100"
            >
              <TriangleAlert className="size-3.5" />
              <span className="sm:hidden">Error events</span>
              <span className="hidden sm:inline">High Error Events Table</span>
            </TabsTrigger>
            <TabsTrigger
              value="lead-time"
              className="h-8 flex-none rounded-none px-0 pb-2 text-[11px] font-medium text-zinc-500 data-active:text-zinc-100"
            >
              <Clock3 className="size-3.5" />
              <span className="sm:hidden">Lead time</span>
              <span className="hidden sm:inline">Publish Lead Time Analysis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="mt-3">
            <PeriodTable points={points} loading={loading} />
          </TabsContent>
          <TabsContent value="events" className="mt-3">
            <HighErrorTable points={points} loading={loading} />
          </TabsContent>
          <TabsContent value="lead-time" className="mt-3">
            <LeadTimeAnalysis points={points} loading={loading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
