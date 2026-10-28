"use client";

import {
  Activity,
  BookOpen,
  ChevronRight,
  CircleHelp,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  Sparkles,
  Wind,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Historical Forecasts", icon: History, active: false },
  { label: "Error Analytics", icon: Activity, active: false },
  { label: "Market Risk", icon: ShieldAlert, active: false },
] as const;

const SYSTEM_ITEMS = [{ label: "Settings", icon: Settings }] as const;

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  apiStatus: "online" | "offline" | "connecting";
}

function NavButton({
  label,
  icon: Icon,
  active = false,
  collapsed = false,
  soon = false,
  onNavigate,
}: {
  label: string;
  icon: typeof LayoutDashboard;
  active?: boolean;
  collapsed?: boolean;
  soon?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      aria-disabled={!active}
      onClick={() => {
        if (active) onNavigate?.();
      }}
      className={cn(
        "group flex h-9 w-full items-center gap-2.5 rounded-lg border px-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "border-zinc-800/80 bg-zinc-900/80 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-200",
        !active && "cursor-default",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300",
        )}
      />
      {!collapsed ? (
        <>
          <span className="truncate">{label}</span>
          {soon ? (
            <span className="ml-auto rounded-full border border-zinc-800 bg-zinc-900 px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-zinc-600">
              Soon
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  );
}

function SidebarBody({
  collapsed,
  onCollapsedChange,
  onNavigate,
  apiStatus,
}: {
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  apiStatus: "online" | "offline" | "connecting";
}) {
  const isLocalApi = /localhost|127\.0\.0\.1/.test(API_BASE_URL);
  const statusLabel =
    apiStatus === "online"
      ? `FastAPI · ${isLocalApi ? "local" : "live"}`
      : apiStatus === "offline"
        ? "FastAPI · offline"
        : "FastAPI · connecting";
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div
        className={cn(
          "flex items-center gap-2.5 px-1",
          collapsed && "flex-col gap-3",
        )}
      >
        <div className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-600 text-zinc-950 shadow-[0_0_26px_-6px_rgba(52,211,153,0.55)]">
          <Wind aria-hidden className="size-5" strokeWidth={2.4} />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-zinc-100">
              WindScope
            </p>
            <p className="truncate text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              GB Day-Ahead
            </p>
          </div>
        ) : null}
        {onCollapsedChange ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200",
              !collapsed && "ml-auto",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        ) : null}
      </div>

      <nav className="mt-7 flex flex-col gap-1" aria-label="Primary">
        {!collapsed ? (
          <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            Platform
          </p>
        ) : null}
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.label}
            label={item.label}
            icon={item.icon}
            active={item.active}
            collapsed={collapsed}
            soon={!item.active}
            onNavigate={onNavigate}
          />
        ))}

        {!collapsed ? (
          <p className="mb-1 mt-5 px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-600">
            System
          </p>
        ) : (
          <div className="my-3 h-px bg-zinc-800/60" />
        )}
        {SYSTEM_ITEMS.map((item) => (
          <NavButton
            key={item.label}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
            soon
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {!collapsed ? (
          <div className="relative overflow-hidden rounded-xl border border-zinc-800/70 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-3">
            <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
              <Sparkles aria-hidden className="size-3.5 text-emerald-400" />
              What&apos;s new
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-zinc-500">
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-zinc-600" />
                January 2026 dataset live
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-zinc-600" />
                Gate-closure vintages isolated
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-zinc-600" />
                Imbalance cost estimator
              </li>
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <a
            href={`${API_BASE_URL}/docs`}
            target="_blank"
            rel="noreferrer"
            title={collapsed ? "API documentation" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-900/50 hover:text-zinc-200",
              collapsed && "justify-center px-0",
            )}
          >
            <BookOpen aria-hidden className="size-3.5" />
            {!collapsed ? (
              <>
                <span>API documentation</span>
                <ChevronRight aria-hidden className="ml-auto size-3.5 text-zinc-700" />
              </>
            ) : null}
          </a>
          <a
            href="https://bmrs.elexon.co.uk/"
            target="_blank"
            rel="noreferrer"
            title={collapsed ? "Elexon BMRS" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-900/50 hover:text-zinc-200",
              collapsed && "justify-center px-0",
            )}
          >
            <CircleHelp aria-hidden className="size-3.5" />
            {!collapsed ? <span>Elexon BMRS</span> : null}
          </a>
        </div>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2",
            collapsed && "justify-center px-0",
          )}
          title={collapsed ? statusLabel : undefined}
        >
          <span className="relative flex size-1.5">
            {apiStatus !== "offline" ? (
              <span
                className={cn(
                  "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                  apiStatus === "online" ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                apiStatus === "online"
                  ? "bg-emerald-400"
                  : apiStatus === "offline"
                    ? "bg-rose-400"
                    : "bg-amber-400",
              )}
            />
          </span>
          {!collapsed ? (
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-[0.12em]",
                apiStatus === "offline" ? "text-rose-400/90" : "text-zinc-500",
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  apiStatus,
}: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-zinc-800/60 bg-[#0C0C0E]/95 backdrop-blur-xl transition-[width] duration-300 ease-out lg:block",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <SidebarBody
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          apiStatus={apiStatus}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] border-zinc-800/60 bg-[#0C0C0E] p-0 sm:max-w-[280px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
            <SheetDescription>WindScope dashboard navigation</SheetDescription>
          </SheetHeader>
          <SidebarBody
            collapsed={false}
            onNavigate={() => onMobileOpenChange(false)}
            apiStatus={apiStatus}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
