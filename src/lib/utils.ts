// Join truthy class-name parts. Small local helper (no clsx dependency yet).
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
