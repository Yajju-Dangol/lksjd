"use client";

import {
  Activity,
  BookOpen,
  CircleHelp,
  History,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
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

export type DashboardView = "dashboard" | "history" | "analytics" | "risk";

const NAV_ITEMS: Array<{
  id: DashboardView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history", label: "Historical Forecasts", icon: History },
  { id: "analytics", label: "Error Analytics", icon: Activity },
  { id: "risk", label: "Market Risk", icon: ShieldAlert },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

function NavButton({
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: {
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "group flex h-9 w-full items-center gap-2.5 rounded-lg border px-2.5 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "border-zinc-800/80 bg-zinc-900/80 text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-200",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-4 shrink-0",
          active ? "text-emerald-400" : "text-zinc-500 group-hover:text-zinc-300",
        )}
      />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </button>
  );
}

function SidebarBody({
  collapsed,
  onCollapsedChange,
  onNavigate,
  activeView,
  onViewChange,
}: {
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}) {
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
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={activeView === item.id}
            collapsed={collapsed}
            onClick={() => {
              onViewChange(item.id);
              onNavigate?.();
            }}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-zinc-800/60 pt-3">
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
          {!collapsed ? <span>API documentation</span> : null}
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
    </div>
  );
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
  activeView,
  onViewChange,
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
          activeView={activeView}
          onViewChange={onViewChange}
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
            activeView={activeView}
            onViewChange={onViewChange}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
