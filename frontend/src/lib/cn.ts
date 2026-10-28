type ClassValue = string | undefined | null | false;

/** Minimal class-name joiner — swap for `clsx` + `tailwind-merge` if needed. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
