import { DISPLACED_FROM_REGIONS, UKRAINE_REGIONS } from "@/db/enums";

// Region <select> options, sorted by their UKRAINIAN label.
//
// UKRAINE_REGIONS is ordered alphabetically by SLUG — which is Latin, so the
// list renders in an order that looks random to someone reading Cyrillic
// («Черкаська» first, «Автономна Республіка Крим» last). Sorting by the
// localized label is the only ordering that helps the person actually scanning
// twenty-five options, and `uk` collation puts Ukrainian letters in the order
// they were taught.
export function regionOptions(
  t: (key: string) => string,
): { value: string; label: string }[] {
  return sortByLabel(
    UKRAINE_REGIONS.map((region) => ({ value: region, label: t(region) })),
  );
}

function sortByLabel<T extends { label: string }>(options: T[]): T[] {
  return options.sort((a, b) => a.label.localeCompare(b.label, "uk"));
}

// The oblasts a family can have been displaced FROM — the occupied and
// front-line ones. Sorted the same way, for the same reason.
export function displacedFromRegionOptions(
  t: (key: string) => string,
): { value: string; label: string }[] {
  return sortByLabel(
    DISPLACED_FROM_REGIONS.map((region) => ({
      value: region,
      label: t(region),
    })),
  );
}
