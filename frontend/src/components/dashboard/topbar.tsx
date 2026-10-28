"use client";

import { Menu, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { DataSource } from "@/types/api";

interface TopbarProps {
  loading: boolean;
  offline: boolean;
  source: DataSource | null;
  cacheUpdatedAt: string | null;
  onMenuClick: () => void;
  onRefresh: () => void;
}

function SourceBadge({
  offline,
  source,
  cacheUpdatedAt,
}: {
  offline: boolean;
  source: DataSource | null;
  cacheUpdatedAt: string | null;
}) {
  const isLive = source === "elexon";
  const label = offline
    ? "Offline"
    : source == null
      ? "Connecting"
      : isLive
        ? "Live feed"
        : "Cached snapshot";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-6 gap-1.5 border px-2 text-[10px] font-medium tracking-wide",
            !offline &&
              source == null &&
              "border-zinc-800 bg-zinc-900/40 text-zinc-500",
            !offline &&
              isLive &&
              "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
            !offline &&
              source === "cache" &&
              "border-amber-500/25 bg-amber-500/10 text-amber-400",
            offline && "border-rose-500/25 bg-rose-500/10 text-rose-400",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              !offline && source == null && "bg-zinc-500",
              !offline &&
                isLive &&
                "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]",
              !offline && source === "cache" && "bg-amber-400",
              offline && "bg-rose-400",
            )}
          />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="border border-zinc-700/60 bg-zinc-900 text-zinc-300">
        {offline
          ? "Backend unreachable. Start FastAPI on port 8000 and retry."
          : isLive
            ? "Served from Elexon BMRS in this session."
            : source === "cache"
              ? `Local JSON cache · ${cacheUpdatedAt ? formatDateTime(cacheUpdatedAt) : "timestamp unavailable"}`
              : "Waiting for the FastAPI backend."}
      </TooltipContent>
    </Tooltip>
  );
}

export function Topbar({
  loading,
  offline,
  source,
  cacheUpdatedAt,
  onMenuClick,
  onRefresh,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 lg:hidden"
        >
          <Menu className="size-4" />
        </Button>

        <div className="flex min-w-0 items-center gap-2">
          <h1 className="text-base font-medium tracking-tight text-zinc-100">
            Dashboard
          </h1>
          <Badge
            variant="outline"
            className="hidden h-5 border-zinc-800 bg-zinc-900/40 text-[10px] font-normal text-zinc-500 sm:inline-flex"
          >
            Jan 2026
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <SourceBadge
            offline={offline}
            source={source}
            cacheUpdatedAt={cacheUpdatedAt}
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Refresh data"
                onClick={onRefresh}
                disabled={loading}
                className="size-8 border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border border-zinc-700/60 bg-zinc-900 text-zinc-300">
              Refetch metrics and generation data
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
