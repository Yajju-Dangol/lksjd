"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartNoAxesCombined } from "lucide-react";

import type { WindDataPoint } from "@/types/api";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function WindChart({ data }: { data: WindDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 text-center dark:border-slate-700">
        <ChartNoAxesCombined
          aria-hidden
          className="size-6 text-slate-300 dark:text-slate-600"
        />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          No aligned settlement periods yet
        </p>
        <p className="max-w-xs text-xs leading-5 text-slate-400">
          The FUELHH / WINDFOR ingestion pipeline will populate this series once
          Phase 1 is wired up.
        </p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
          <XAxis
            dataKey="start_time"
            tickFormatter={(value: string) => timeFormatter.format(new Date(value))}
            tick={{ fontSize: 11 }}
            minTickGap={48}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            width={56}
            label={{ value: "MW", angle: -90, position: "insideLeft", fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <Tooltip
            labelFormatter={(value) => timeFormatter.format(new Date(String(value)))}
            formatter={(value) => `${value ?? "—"} MW`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="actual_mw"
            name="Actual"
            stroke="#0ea5e9"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="forecast_mw"
            name="Forecast"
            stroke="#f59e0b"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
