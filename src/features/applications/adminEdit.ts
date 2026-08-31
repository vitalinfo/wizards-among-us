import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

// Which fields an admin edit actually changed, as a comma-separated list of
// NAMES for the audit trail. Never values: the fields hold a child's address and
// the family's story, and putting those in audit_logs would make it a second
// copy of the sensitive data with a different retention story. Names answer the
// question the trail exists for — who changed what, and when.
// giftPrice is a numeric() column: "1200.00" in the row, 1200 from the form.
// Comparing as strings would report an untouched price as changed on every
// edit, so numbers are compared as numbers.
function isSame(previous: unknown, next: unknown): boolean {
  if (previous === null || previous === undefined) {
    return next === null || next === undefined;
  }
  if (next === null || next === undefined) {
    return false;
  }
  const a = Number(previous);
  const b = Number(next);
  if (
    typeof previous !== "boolean" &&
    typeof next !== "boolean" &&
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    String(previous).trim() !== "" &&
    String(next).trim() !== ""
  ) {
    return a === b;
  }
  return String(previous) === String(next);
}

export function describeChangedFields(
  before: Application,
  after: Record<string, unknown>,
): string {
  const changed: string[] = [];
  for (const [key, next] of Object.entries(after)) {
    if (key === "giftUrls") {
      const previous =
        (before.typeFields as { giftUrls?: unknown } | null)?.giftUrls ??
        undefined;
      if (JSON.stringify(previous) !== JSON.stringify(next)) {
        changed.push(key);
      }
      continue;
    }
    if (!(key in before)) {
      continue;
    }
    const previous = before[key as keyof Application];
    if (!isSame(previous, next)) {
      changed.push(key);
    }
  }
  return changed.sort().join(",");
}
