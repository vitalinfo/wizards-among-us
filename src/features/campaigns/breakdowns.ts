import {
  CHILD_GENDERS,
  DISPLACED_FROM_REGIONS,
  type ApplicationStatus,
  type ChildGender,
  type UkraineRegion,
} from "@/db/enums";
import { CHILD_AGE_MAX, CHILD_AGE_MIN } from "@/lib/applicationFieldOptions";

// A campaign's applications split by one field — home region («звідки
// виїхали»), the child's age, the child's sex — on the campaign analytics
// page. Counts, never a row of child data.

// Every application a family actually sent and was not turned away for (Vital):
// a draft was never sent, a rejection is not a family in the programme.
export const BREAKDOWN_STATUSES = [
  "submitted",
  "approved",
  "claimed",
  "processed",
  "fulfilled",
] as const satisfies readonly ApplicationStatus[];

export type Count<K> = { value: K; count: number };
export type Bar<K> = Count<K> & { label: string };

// Every value the form offers, zeros included, so an empty one reads as empty
// rather than missing. A value outside that list — a row from before the list
// was narrowed, or set by an admin — is kept only when it has applications, so
// the bars still add up to the campaign.
function withZeros<K>(offered: readonly K[], counts: Count<K>[]): Count<K>[] {
  const byValue = new Map<K, number>(offered.map((value) => [value, 0]));
  for (const { value, count } of counts) {
    if (count > 0 || byValue.has(value)) {
      byValue.set(value, (byValue.get(value) ?? 0) + count);
    }
  }
  return [...byValue].map(([value, count]) => ({ value, count }));
}

// Largest first; ties by the label, as people read them.
export function buildRegionBars(
  counts: Count<UkraineRegion>[],
  label: (region: UkraineRegion) => string,
): Bar<UkraineRegion>[] {
  return withZeros(DISPLACED_FROM_REGIONS, counts)
    .map((entry) => ({ ...entry, label: label(entry.value) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "uk"));
}

// One bar per year, youngest first (Vital) — an age is an order, not a rank.
// An age the form no longer accepts (it took 18 once) still shows when counted.
export function buildAgeBars(
  counts: Count<number>[],
  label: (age: number) => string,
): Bar<number>[] {
  const ages = Array.from(
    { length: CHILD_AGE_MAX - CHILD_AGE_MIN + 1 },
    (_, i) => CHILD_AGE_MIN + i,
  );
  return withZeros(ages, counts)
    .sort((a, b) => a.value - b.value)
    .map((entry) => ({ ...entry, label: label(entry.value) }));
}

// In the form's order. An application with no sex recorded (filed before the
// field existed) is left out, not shown as its own bar (Vital).
export function buildGenderBars(
  counts: Count<ChildGender>[],
  label: (gender: ChildGender) => string,
): Bar<ChildGender>[] {
  return withZeros(CHILD_GENDERS, counts).map((entry) => ({
    ...entry,
    label: label(entry.value),
  }));
}
