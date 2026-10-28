"use client";

import { useMemo, useState } from "react";
import { RefreshCw, TriangleAlert, Zap } from "lucide-react";

import { DataTabs } from "@/components/dashboard/data-tabs";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Sidebar, type DashboardView } from "@/components/dashboard/sidebar";
import { ThermalEstimator } from "@/components/dashboard/thermal-estimator";
import { Topbar } from "@/components/dashboard/topbar";
import { ErrorAnalyticsView } from "@/components/views/error-analytics";
import { HistoricalForecastsView } from "@/components/views/historical-forecasts";
import { MarketRiskView } from "@/components/views/market-risk";
import { Button } from "@/components/ui/button";
import { useWindDashboard } from "@/hooks/use-wind-dashboard";
import { formatDate, formatNumber } from "@/lib/format";
import {
  DATASET_END,
  getRange,
  type ChartRange,
  type RangeKey,
  type Resolution,
} from "@/lib/ranges";
import { cn } from "@/lib/utils";

const VIEW_TITLES: Record<DashboardView, string> = {
  dashboard: "Dashboard",
  history: "Historical Forecasts",
  analytics: "Error Analytics",
  risk: "Market Risk",
};

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function ErrorBanner({
  message,
  hasData,
  onRetry,
}: {
  message: string;
  hasData: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-3 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
        hasData
          ? "border-amber-500/25 bg-amber-500/[0.06]"
          : "border-rose-500/25 bg-rose-500/[0.06]",
      )}
    >
      <TriangleAlert
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          hasData ? "text-amber-400" : "text-rose-400",
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-200">
          {hasData
            ? "Refresh failed — showing the last loaded snapshot"
            : "Live data is unavailable"}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-zinc-500">{message}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="h-7 border-zinc-700 bg-zinc-900/60 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
      >
        <RefreshCw className="size-3" />
        Retry
      </Button>
    </div>
  );
}

export function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeView, setActiveView] = useState<DashboardView>("dashboard");
  const [rangeKey, setRangeKey] = useState<RangeKey>("full");
  const [spotlightRange, setSpotlightRange] = useState<ChartRange | null>(null);
  const [resolution, setResolution] = useState<Resolution>("30m");
  const [refreshToken, setRefreshToken] = useState(0);

  const preset = getRange(rangeKey);
  const range = spotlightRange ?? preset;
  const { data, loading, error, refresh } = useWindDashboard(
    range.start,
    range.end,
    refreshToken,
  );

  const metrics = data?.metrics ?? null;
  const latestMetrics = data?.latestMetrics ?? null;
  const points = data?.generation.points ?? [];
  const monthMetrics = data?.monthMetrics ?? null;

  const spotlight = useMemo(() => {
    if (!monthMetrics?.max_error_time) return null;
    const peakDate = monthMetrics.max_error_time.slice(0, 10);
    let start = peakDate;
    let end = addDays(peakDate, 1);

    if (end > DATASET_END) {
      end = DATASET_END;
      start = addDays(end, -1);
    }

    return {
      key: "spotlight",
      label: `${formatDate(`${start}T00:00:00Z`)}–${formatDate(`${end}T00:00:00Z`)}`,
      start,
      end,
      peakTime: monthMetrics.max_error_time,
      peakMw: monthMetrics.max_error_mw,
    };
  }, [monthMetrics]);

  function handleRangeChange(key: RangeKey) {
    setSpotlightRange(null);
    setRangeKey(key);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
        )}
      >
        <Topbar
          title={VIEW_TITLES[activeView]}
          loading={loading}
          offline={data == null && error != null}
          source={data?.generation.source ?? null}
          cacheUpdatedAt={data?.generation.cache_updated_at ?? null}
          onMenuClick={() => setMobileOpen(true)}
          onRefresh={() => setRefreshToken((token) => token + 1)}
        />

        <main
          aria-label="Wind forecast dashboard"
          className="mx-auto w-full max-w-[1560px] flex-1 px-3 pb-8 pt-4 sm:px-5 lg:px-6"
        >
          {activeView === "dashboard" ? (
            <>
              {error ? (
                <ErrorBanner
                  message={error}
                  hasData={data != null}
                  onRetry={refresh}
                />
              ) : null}

              <section aria-label="Key performance indicators">
                <KpiCards
                  metrics={metrics}
                  latestMetrics={latestMetrics}
                  loading={loading}
                />
              </section>

              <section
                aria-label="Generation and forecast time series"
                className="mt-3"
              >
                {spotlight ? (
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={spotlightRange != null}
                      onClick={() =>
                        setSpotlightRange((current) =>
                          current ? null : spotlight,
                        )
                      }
                      className={cn(
                        "h-8 gap-2 rounded-full border px-3 text-[11px]",
                        spotlightRange
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
                          : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100",
                      )}
                    >
                      <Zap
                        aria-hidden
                        className={cn(
                          "size-3.5",
                          spotlightRange ? "text-rose-400" : "text-amber-400",
                        )}
                      />
                      Spotlight: {formatDate(spotlight.peakTime)} storm front
                      <span
                        className={cn(
                          "tabular-nums",
                          spotlightRange
                            ? "text-rose-400/80"
                            : "text-zinc-500",
                        )}
                      >
                        Peak {formatNumber(spotlight.peakMw)} MW
                      </span>
                    </Button>
                    {spotlightRange ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSpotlightRange(null)}
                        className="h-8 text-[11px] text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                <ForecastChart
                  data={data?.generation ?? null}
                  loading={loading}
                  range={range}
                  resolution={resolution}
                  onRangeChange={handleRangeChange}
                  onResolutionChange={setResolution}
                />
              </section>

              <section
                aria-label="Settlement detail and financial exposure"
                className="mt-3 grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_360px]"
              >
                <DataTabs points={points} loading={loading} />
                <ThermalEstimator points={points} loading={loading} />
              </section>
            </>
          ) : null}

          {activeView === "history" ? (
            <HistoricalForecastsView refreshToken={refreshToken} />
          ) : null}
          {activeView === "analytics" ? (
            <ErrorAnalyticsView refreshToken={refreshToken} />
          ) : null}
          {activeView === "risk" ? (
            <MarketRiskView refreshToken={refreshToken} />
          ) : null}

          <footer className="mt-5 border-t border-zinc-800/60 pt-3 text-[10px] text-zinc-600">
            Elexon BMRS · FUELHH + WINDFOR · UTC
          </footer>
        </main>
      </div>
    </div>
  );
}
