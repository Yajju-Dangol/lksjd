"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ViewError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3">
      <TriangleAlert aria-hidden className="size-4 shrink-0 text-rose-400" />
      <p className="min-w-0 flex-1 truncate text-xs text-zinc-400">{message}</p>
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
