"use client";

import { useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { DataTabs } from "@/components/dashboard/data-tabs";
import { ForecastChart } from "@/components/dashboard/forecast-chart";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ThermalEstimator } from "@/components/dashboard/thermal-estimator";
import { Topbar } from "@/components/dashboard/topbar";
import { Button } from "@/components/ui/button";
import { useWindDashboard } from "@/hooks/use-wind-dashboard";
import { getRange, type RangeKey, type Resolution } from "@/lib/ranges";
import { cn } from "@/lib/utils";

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
  const [rangeKey, setRangeKey] = useState<RangeKey>("full");
  const [resolution, setResolution] = useState<Resolution>("30m");

  const range = getRange(rangeKey);
  const { data, loading, error, refresh } = useWindDashboard(
    range.start,
    range.end,
  );

  const metrics = data?.metrics ?? null;
  const latestMetrics = data?.latestMetrics ?? null;
  const points = data?.generation.points ?? [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
        )}
      >
        <Topbar
          loading={loading}
          offline={data == null && error != null}
          source={data?.generation.source ?? null}
          cacheUpdatedAt={data?.generation.cache_updated_at ?? null}
          onMenuClick={() => setMobileOpen(true)}
          onRefresh={refresh}
        />

        <main
          aria-label="Wind forecast dashboard"
          className="mx-auto w-full max-w-[1560px] flex-1 px-3 pb-8 pt-4 sm:px-5 lg:px-6"
        >
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
            <ForecastChart
              data={data?.generation ?? null}
              loading={loading}
              range={range}
              resolution={resolution}
              onRangeChange={setRangeKey}
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

          <footer className="mt-5 border-t border-zinc-800/60 pt-3 text-[10px] text-zinc-600">
            Elexon BMRS · FUELHH + WINDFOR · UTC
          </footer>
        </main>
      </div>
    </div>
  );
}
