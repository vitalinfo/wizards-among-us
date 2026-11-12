import { describe, expect, it } from "vitest";

import { DISPLACED_FROM_REGIONS } from "@/db/enums";

import messages from "../../../../messages/uk.json";
import { buildRegionCounts } from "../regionCounts";

const label = (region: keyof typeof messages.regions) =>
  messages.regions[region];

describe("buildRegionCounts", () => {
  it("lists every region the form offers, zeros included", () => {
    const bars = buildRegionCounts([], label);

    expect(bars.map(({ region }) => region).sort()).toEqual(
      [...DISPLACED_FROM_REGIONS].sort(),
    );
    expect(bars.every(({ count }) => count === 0)).toBe(true);
  });

  it("puts the largest first and breaks ties by the Ukrainian label", () => {
    const bars = buildRegionCounts(
      [
        { region: "kharkiv", count: 2 },
        { region: "donetsk", count: 5 },
        { region: "chernihiv", count: 2 },
      ],
      label,
    );

    expect(bars.slice(0, 3)).toEqual([
      { region: "donetsk", count: 5, label: "Донецька область" },
      { region: "kharkiv", count: 2, label: "Харківська область" },
      { region: "chernihiv", count: 2, label: "Чернігівська область" },
    ]);
    // The zeros follow in label order: «Автономна Республіка Крим» first.
    expect(bars[3]).toEqual({
      region: "crimea",
      count: 0,
      label: "Автономна Республіка Крим",
    });
  });

  it("keeps a region outside the form's list only when it has applications", () => {
    const bars = buildRegionCounts(
      [
        { region: "volyn", count: 1 },
        { region: "lviv", count: 0 },
      ],
      label,
    );

    expect(bars[0]).toEqual({
      region: "volyn",
      count: 1,
      label: "Волинська область",
    });
    expect(bars.find(({ region }) => region === "lviv")).toBeUndefined();
    expect(bars).toHaveLength(DISPLACED_FROM_REGIONS.length + 1);
  });
});
