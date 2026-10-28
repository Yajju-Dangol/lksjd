import {
  CalendarClock,
  CloudSun,
  Gauge,
  ServerCog,
  TriangleAlert,
  Wind,
} from "lucide-react";

import { ApiStatus } from "@/components/api-status";
import { KpiCard } from "@/components/kpi-card";
import { WindChart } from "@/components/wind-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const kpis = [
  {
    label: "Mean absolute error",
    value: "—",
    unit: "MW",
    description: "Average absolute forecast miss per settlement period.",
    icon: Gauge,
  },
  {
    label: "RMSE",
    value: "—",
    unit: "MW",
    description: "Penalises large misses; a proxy for imbalance risk.",
    icon: CloudSun,
  },
  {
    label: "Peak error",
    value: "—",
    unit: "MW",
    description: "Largest single-period divergence in the window.",
    icon: TriangleAlert,
    tone: "warning" as const,
  },
  {
    label: "Over-forecast",
    value: "—",
    unit: "%",
    description: "Share of periods where forecast exceeded actual wind.",
    icon: CalendarClock,
  },
];

const scope = [
  { label: "Actuals", value: "Elexon FUELHH · fuelType = WIND" },
  { label: "Forecasts", value: "Elexon WINDFOR · publishTime filtered" },
  { label: "Period", value: "1 – 31 January 2026 (UTC)" },
  { label: "Snapshot", value: "Day-ahead gate closure, 11:00 UTC D-1" },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-sky-600 text-white">
              <Wind aria-hidden className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Wind Forecast Intelligence
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GB day-ahead procurement · January 2026
              </p>
            </div>
          </div>
          <ApiStatus />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        <section className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Forecast accuracy dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Quantifies how far Elexon&apos;s day-ahead wind forecasts diverged
            from metered generation, so purchase volumes can be adjusted before
            gate closure.
          </p>
        </section>

        <section
          aria-label="Dataset scope"
          className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-800"
        >
          {scope.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 bg-white px-4 py-3 dark:bg-slate-900"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {item.label}
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {item.value}
              </span>
            </div>
          ))}
        </section>

        <section
          aria-label="Key performance indicators"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <CardTitle>Actual vs. forecast wind generation</CardTitle>
              <CardDescription>
                30-minute settlement periods · national GB wind fleet
              </CardDescription>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <ServerCog aria-hidden className="size-3.5" />
              Awaiting pipeline
            </span>
          </CardHeader>
          <CardContent>
            <WindChart data={[]} />
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Thermal imbalance estimator</CardTitle>
              <CardDescription>
                Converts MW forecast error into £ exposure at a configurable
                backup-power cost.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
                Slider lands with the dashboard phase, driven by the{" "}
                <code className="font-mono">/api/v1/metrics</code> response.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snapshot engine</CardTitle>
              <CardDescription>
                Compare the strict day-ahead constraint with the latest
                available forecast vintage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["Day-ahead (11:00 UTC D-1)", "Latest published"].map(
                  (option, index) => (
                    <span
                      key={option}
                      className={
                        index === 0
                          ? "rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-slate-100 dark:text-slate-900"
                          : "rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400"
                      }
                    >
                      {option}
                    </span>
                  ),
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-400">
                Controls become interactive once the backend exposes forecast
                vintages.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-5 dark:border-slate-800">
        <p className="mx-auto w-full max-w-6xl px-6 text-xs text-slate-400">
          Data source: Elexon BMRS Insights API · Scoped to January 2026 ·
          Timestamps in UTC
        </p>
      </footer>
    </div>
  );
}
