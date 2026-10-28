"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Flame, ShieldAlert, TrendingUp } from "lucide-react";
import type { TooltipContentProps } from "recharts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ViewError } from "@/components/views/view-state";
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
import { useWindDashboard } from "@/hooks/use-wind-dashboard";
import { formatDate, formatNumber, formatPct } from "@/lib/format";
import { DATASET_END, DATASET_START } from "@/lib/ranges";
import { cn } from "@/lib/utils";
import type { GenerationDataPoint } from "@/types/api";

interface DayRisk {
  date: string;
  mae: number;
  peak: number;
  overPct: number;
  net: number;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDayRisk(points: GenerationDataPoint[]): DayRisk[] {
  const groups = new Map<string, number[]>();

  for (const point of points) {
    if (point.error_mw == null) continue;
    const date = point.startTime.slice(0, 10);
    const group = groups.get(date) ?? [];
    group.push(point.error_mw);
    groups.set(date, group);
  }

  return [...groups.entries()]
    .map(([date, errors]) => ({
      date,
      mae: mean(errors.map(Math.abs)),
      peak: Math.max(...errors.map(Math.abs)),
      overPct: (errors.filter((error) => error > 0).length / errors.length) * 100,
      net: errors.reduce((sum, error) => sum + error, 0),
    }))
    .sort((left, right) => right.peak - left.peak);
}

function riskLevel(peak: number): {
  label: string;
  className: string;
} {
  if (peak >= 5000) {
    return {
      label: "Extreme",
      className: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    };
  }
  if (peak >= 3000) {
    return {
      label: "High",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    };
  }
  if (peak >= 1500) {
    return {
      label: "Elevated",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    };
  }
  return {
    label: "Moderate",
    className: "border-zinc-800 bg-zinc-900/50 text-zinc-500",
  };
}

function RiskTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as DayRisk | undefined;
  if (!active || !point) return null;

  return (
    <div className="min-w-[170px] rounded-xl border border-zinc-700/60 bg-zinc-900/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        {formatDate(`${point.date}T00:00:00Z`)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-4 text-[11px]">
        <span className="text-zinc-400">Daily MAE</span>
        <span className="font-medium tabular-nums text-zinc-100">
          {formatNumber(point.mae)} MW
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-zinc-800/80 pt-1.5 text-[11px]">
        <span className="text-zinc-500">Peak miss</span>
        <span className="font-medium tabular-nums text-rose-400">
          {formatNumber(point.peak)} MW
        </span>
      </div>
    </div>
  );
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

export function MarketRiskView({
  refreshToken = 0,
}: {
  refreshToken?: number;
}) {
  const { data, loading, error, refresh } = useWindDashboard(
    DATASET_START,
    DATASET_END,
    refreshToken,
  );
  const points = useMemo(
    () => data?.generation.points ?? [],
    [data],
  );

  const days = useMemo(() => buildDayRisk(points), [points]);
  const topDays = days.slice(0, 7);
  const chartDays = [...days].sort((left, right) => left.date.localeCompare(right.date));
  const topDates = new Set(topDays.slice(0, 5).map((day) => day.date));
  const peakDay = days[0] ?? null;
  const highestMae = [...days].sort((left, right) => right.mae - left.mae)[0] ?? null;
  const extremeDays = days.filter((day) => day.peak >= 5000).length;

  if (loading && !data) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] bg-zinc-900/70" />
          ))}
        </div>
        <Skeleton className="h-[300px] bg-zinc-900/70" />
        <Skeleton className="h-[320px] bg-zinc-900/70" />
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
          label="Peak risk day"
          value={peakDay ? formatDate(`${peakDay.date}T00:00:00Z`) : "—"}
          detail={peakDay ? `${formatNumber(peakDay.peak)} MW peak miss` : "No data"}
          icon={Flame}
        />
        <StatCard
          label="Highest daily MAE"
          value={highestMae ? `${formatNumber(highestMae.mae)} MW` : "—"}
          detail={
            highestMae
              ? formatDate(`${highestMae.date}T00:00:00Z`)
              : "No aligned periods"
          }
          icon={TrendingUp}
        />
        <StatCard
          label="Extreme risk days"
          value={formatNumber(extremeDays)}
          detail="Peak miss above 5,000 MW"
          icon={ShieldAlert}
        />
      </div>

      <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
        <CardContent className="px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium tracking-tight text-zinc-200">
              Daily mean absolute error
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="size-2 rounded-sm bg-rose-400" />
              Top 5 risk days
            </span>
          </div>

          <div className="mt-4 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartDays}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#27272a"
                  strokeDasharray="3 3"
                  strokeOpacity={0.65}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={28}
                  dy={8}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  tickFormatter={(value: string) =>
                    formatDate(`${value}T00:00:00Z`)
                  }
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={42}
                  tickCount={4}
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `${Math.round(value / 1000)}k` : `${value}`
                  }
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={(props) => <RiskTooltip {...props} />}
                />
                <Bar
                  dataKey="mae"
                  name="Daily MAE"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                >
                  {chartDays.map((day) => (
                    <Cell
                      key={day.date}
                      fill={topDates.has(day.date) ? "#fb7185" : "#52525b"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 border border-zinc-800/60 bg-zinc-950/70 py-0 ring-0">
        <CardContent className="px-4 py-4 sm:px-5">
          <h2 className="text-sm font-medium tracking-tight text-zinc-200">
            Peak risk days
          </h2>
          <div className="mt-3 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/60 hover:bg-transparent">
                  <TableHead className="h-8 w-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    #
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    Date
                  </TableHead>
                  <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    Peak miss
                  </TableHead>
                  <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    MAE
                  </TableHead>
                  <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    Over
                  </TableHead>
                  <TableHead className="h-8 text-right text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                    Risk
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topDays.map((day, index) => {
                  const level = riskLevel(day.peak);
                  return (
                    <TableRow
                      key={day.date}
                      className="border-zinc-800/40 hover:bg-zinc-900/40"
                    >
                      <TableCell className="py-2 text-[11px] tabular-nums text-zinc-600">
                        {String(index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="py-2 text-[11px] tabular-nums text-zinc-300">
                        {formatDate(`${day.date}T00:00:00Z`)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-[11px] font-medium tabular-nums text-rose-400">
                        {formatNumber(day.peak)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-300">
                        {formatNumber(day.mae)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-[11px] tabular-nums text-zinc-500">
                        {formatPct(day.overPct, 1)}
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 border text-[10px] font-normal",
                            level.className,
                          )}
                        >
                          {level.label}
                        </Badge>
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
  );
}
