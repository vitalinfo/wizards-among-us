import { describe, expect, it } from "vitest";

import messages from "../../../messages/uk.json";
import { DISPLACED_FROM_REGIONS, UKRAINE_REGIONS } from "@/db/enums";
import { displacedFromRegionOptions, regionOptions } from "../regionOptions";

const t = (key: string) =>
  (messages.regions as Record<string, string>)[key] ?? key;

describe("regionOptions", () => {
  it("returns every region exactly once", () => {
    const options = regionOptions(t);
    expect(options).toHaveLength(UKRAINE_REGIONS.length);
    expect(new Set(options.map((o) => o.value)).size).toBe(
      UKRAINE_REGIONS.length,
    );
  });

  // The enum is ordered by Latin slug, which reads as random order to someone
  // scanning Cyrillic labels.
  it("sorts by the Ukrainian label, not the slug", () => {
    const labels = regionOptions(t).map((o) => o.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, "uk"));
    expect(labels).toEqual(sorted);
    // Concretely: «Автономна Республіка Крим» comes first under uk collation,
    // where the slug order ("crimea") put it last.
    expect(labels[0]).toBe(messages.regions.crimea);
  });
});

describe("displacedFromRegionOptions", () => {
  // Where a family LEFT is the occupied and front-line oblasts; where they live
  // NOW is anywhere in the country.
  it("offers only the oblasts a family can be displaced from", () => {
    const values = displacedFromRegionOptions(t).map((o) => o.value);

    expect(values).toHaveLength(DISPLACED_FROM_REGIONS.length);
    expect(values).toContain("donetsk");
    expect(values).toContain("crimea");
    expect(values).not.toContain("lviv");
    expect(values).not.toContain("volyn");
  });

  it("is a subset of the full taxonomy, not a second list of slugs", () => {
    for (const region of DISPLACED_FROM_REGIONS) {
      expect(UKRAINE_REGIONS).toContain(region);
    }
  });

  it("sorts by the Ukrainian label like every other region list", () => {
    const labels = displacedFromRegionOptions(t).map((o) => o.label);
    expect(labels).toEqual(
      [...labels].sort((a, b) => a.localeCompare(b, "uk")),
    );
  });
});
