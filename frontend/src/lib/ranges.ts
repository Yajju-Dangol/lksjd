export const DATASET_START = "2026-01-01";
export const DATASET_END = "2026-01-31";

export interface ChartRange {
  key: string;
  label: string;
  start: string;
  end: string;
}

export const RANGE_PRESETS = [
  {
    key: "full",
    label: "Full Jan 2026",
    start: DATASET_START,
    end: DATASET_END,
  },
  {
    key: "week1",
    label: "Jan 1–7",
    start: "2026-01-01",
    end: "2026-01-07",
  },
  {
    key: "mid",
    label: "Jan 15–21",
    start: "2026-01-15",
    end: "2026-01-21",
  },
] as const;

export type RangeKey = (typeof RANGE_PRESETS)[number]["key"];
export type RangePreset = (typeof RANGE_PRESETS)[number];

export type Resolution = "30m" | "1h" | "3h";

export const RESOLUTIONS: Array<{ value: Resolution; label: string }> = [
  { value: "30m", label: "30 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "3h", label: "3 hours" },
];

export function getRange(key: RangeKey): RangePreset {
  return RANGE_PRESETS.find((preset) => preset.key === key) ?? RANGE_PRESETS[0];
}

export function rangeSpanDays(range: Pick<ChartRange, "start" | "end">): number {
  const start = new Date(`${range.start}T00:00:00Z`).getTime();
  const end = new Date(`${range.end}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}
