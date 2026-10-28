"use client";

import {
  BookOpen,
  CircleHelp,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
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

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

function SidebarBody({
  collapsed,
  onCollapsedChange,
  onNavigate,
}: {
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
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
        <button
          type="button"
          title={collapsed ? "Dashboard" : undefined}
          aria-current="page"
          onClick={() => onNavigate?.()}
          className={cn(
            "group flex h-9 w-full items-center gap-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/80 px-2.5 text-sm text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors",
            collapsed && "justify-center px-0",
          )}
        >
          <LayoutDashboard
            aria-hidden
            className="size-4 shrink-0 text-emerald-400"
          />
          {!collapsed ? <span className="truncate">Dashboard</span> : null}
        </button>
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
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
