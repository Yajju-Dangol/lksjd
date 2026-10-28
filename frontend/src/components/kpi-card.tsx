import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "warning";
}

export function KpiCard({
  label,
  value,
  unit,
  description,
  icon: Icon,
  tone = "default",
}: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex items-start justify-between gap-3">
          <CardTitle>{label}</CardTitle>
          <span
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              tone === "warning"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                : "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
            )}
          >
            <Icon aria-hidden className="size-4" />
          </span>
        </div>
        <p className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">
            {value}
          </span>
          {unit ? (
            <span className="text-xs font-medium text-slate-400">{unit}</span>
          ) : null}
        </p>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
