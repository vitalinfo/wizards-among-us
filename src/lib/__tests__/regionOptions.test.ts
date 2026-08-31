import { describe, expect, it } from "vitest";

import messages from "../../../messages/uk.json";
import { UKRAINE_REGIONS } from "@/db/enums";
import { regionOptions } from "../regionOptions";

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
