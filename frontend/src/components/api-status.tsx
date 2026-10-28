"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";

import { API_BASE_URL, api } from "@/lib/api";
import { cn } from "@/lib/cn";

type Status = "checking" | "online" | "offline";

export function ApiStatus() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    const controller = new AbortController();

    api
      .health(controller.signal)
      .then(() => setStatus("online"))
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setStatus("offline");
      });

    return () => controller.abort();
  }, []);

  const Icon =
    status === "online"
      ? CircleCheck
      : status === "offline"
        ? CircleAlert
        : LoaderCircle;

  return (
    <div
      title={`API: ${API_BASE_URL}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        status === "online" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
        status === "offline" &&
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
        status === "checking" &&
          "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400",
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-3.5", status === "checking" && "animate-spin")}
      />
      {status === "online"
        ? "API online"
        : status === "offline"
          ? "API offline"
          : "Checking API"}
    </div>
  );
}
