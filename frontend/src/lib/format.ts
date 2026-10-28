const integer = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

const oneDecimal = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const twoDecimals = new Intl.NumberFormat("en-GB", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const weekdayDayMonth = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const clock = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

const dayMonthTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export function formatNumber(value: number, digits: 0 | 1 | 2 = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (digits === 2) return twoDecimals.format(value);
  if (digits === 1) return oneDecimal.format(value);
  return integer.format(value);
}

export function formatMW(value: number | null | undefined, digits: 0 | 1 = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, digits)} MW`;
}

export function formatSignedMW(
  value: number | null | undefined,
  digits: 0 | 1 = 0,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return `${formatNumber(0, digits)} MW`;
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(value), digits)} MW`;
}

export function formatPct(value: number | null | undefined, digits: 1 | 2 = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, digits)}%`;
}

export function formatDeltaPct(value: number, suffix = "%"): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return `0.0${suffix}`;
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(value), 1)}${suffix}`;
}

export function formatGBP(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `£${oneDecimal.format(value / 1_000_000_000)}bn`;
  if (absolute >= 1_000_000) return `£${oneDecimal.format(value / 1_000_000)}m`;
  if (absolute >= 1_000) return `£${integer.format(value / 1_000)}k`;
  return `£${integer.format(value)}`;
}

export function formatTwh(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${twoDecimals.format(value)} TWh`;
}

export function formatSignedTwh(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.005) return "0.00 TWh";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${twoDecimals.format(Math.abs(value))} TWh`;
}

export function formatDate(iso: string): string {
  return dayMonth.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${dayMonthTime.format(new Date(iso))} UTC`;
}

export function formatTooltipStamp(iso: string): string {
  return `${weekdayDayMonth.format(new Date(iso))} · ${clock.format(new Date(iso))} UTC`;
}

export function formatPeriod(iso: string): string {
  return `${dayMonth.format(new Date(iso))} · ${clock.format(new Date(iso))}`;
}

export function formatChartTick(iso: string, spanDays: number): string {
  if (spanDays <= 8) {
    return `${dayMonth.format(new Date(iso))} ${clock.format(new Date(iso))}`;
  }
  return dayMonth.format(new Date(iso));
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function downloadCsv(
  rows: Array<Record<string, string | number | null>>,
  filename: string,
): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key];
        return value == null ? "" : String(value);
      })
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
