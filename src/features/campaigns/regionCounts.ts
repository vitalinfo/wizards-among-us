import {
  DISPLACED_FROM_REGIONS,
  type ApplicationStatus,
  type UkraineRegion,
} from "@/db/enums";

// Applications per home region («звідки виїхали») on the campaign analytics
// page. Counts, never a row of child data.

// Every application a family actually sent and was not turned away for (Vital):
// a draft was never sent, a rejection is not a family in the programme.
export const REGION_COUNTED_STATUSES = [
  "submitted",
  "approved",
  "claimed",
  "processed",
  "fulfilled",
] as const satisfies readonly ApplicationStatus[];

export type RegionCount = { region: UkraineRegion; count: number };

// Every region the form offers, zeros included, so an empty region reads as
// empty rather than missing. A region outside that list — a row from before the
// list was narrowed, or set by an admin — is shown only when it has
// applications, so the bars still add up to the campaign. Largest first; ties
// by the label, as people read them.
export function buildRegionCounts(
  counts: RegionCount[],
  label: (region: UkraineRegion) => string,
): (RegionCount & { label: string })[] {
  const byRegion = new Map<UkraineRegion, number>(
    DISPLACED_FROM_REGIONS.map((region) => [region, 0]),
  );
  for (const { region, count } of counts) {
    if (count > 0 || byRegion.has(region)) {
      byRegion.set(region, (byRegion.get(region) ?? 0) + count);
    }
  }
  return [...byRegion]
    .map(([region, count]) => ({ region, count, label: label(region) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "uk"));
}
