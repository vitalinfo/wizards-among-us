import { describe, expect, it } from "vitest";

import { CHILD_GENDERS, DISPLACED_FROM_REGIONS } from "@/db/enums";
import { CHILD_AGE_MAX, CHILD_AGE_MIN } from "@/lib/applicationFieldOptions";

import messages from "../../../../messages/uk.json";
import { buildAgeBars, buildGenderBars, buildRegionBars } from "../breakdowns";

const regionLabel = (region: keyof typeof messages.regions) =>
  messages.regions[region];
const genderLabel = (gender: keyof typeof messages.genders) =>
  messages.genders[gender];
const ageLabel = (age: number) => `age ${age}`;

describe("buildRegionBars", () => {
  it("lists every region the form offers, zeros included", () => {
    const bars = buildRegionBars([], regionLabel);

    expect(bars.map(({ value }) => value).sort()).toEqual(
      [...DISPLACED_FROM_REGIONS].sort(),
    );
    expect(bars.every(({ count }) => count === 0)).toBe(true);
  });

  it("puts the largest first and breaks ties by the Ukrainian label", () => {
    const bars = buildRegionBars(
      [
        { value: "kharkiv", count: 2 },
        { value: "donetsk", count: 5 },
        { value: "chernihiv", count: 2 },
      ],
      regionLabel,
    );

    expect(bars.slice(0, 3)).toEqual([
      { value: "donetsk", count: 5, label: "Донецька область" },
      { value: "kharkiv", count: 2, label: "Харківська область" },
      { value: "chernihiv", count: 2, label: "Чернігівська область" },
    ]);
    // The zeros follow in label order: «Автономна Республіка Крим» first.
    expect(bars[3]).toEqual({
      value: "crimea",
      count: 0,
      label: "Автономна Республіка Крим",
    });
  });

  it("keeps a region outside the form's list only when it has applications", () => {
    const bars = buildRegionBars(
      [
        { value: "volyn", count: 1 },
        { value: "lviv", count: 0 },
      ],
      regionLabel,
    );

    expect(bars[0]).toEqual({
      value: "volyn",
      count: 1,
      label: "Волинська область",
    });
    expect(bars.find(({ value }) => value === "lviv")).toBeUndefined();
    expect(bars).toHaveLength(DISPLACED_FROM_REGIONS.length + 1);
  });
});

describe("buildAgeBars", () => {
  it("has one bar per year the form accepts, youngest first, zeros included", () => {
    const bars = buildAgeBars(
      [
        { value: 9, count: 1 },
        { value: 2, count: 6 },
      ],
      ageLabel,
    );

    expect(bars.map(({ value }) => value)).toEqual(
      Array.from(
        { length: CHILD_AGE_MAX - CHILD_AGE_MIN + 1 },
        (_, i) => CHILD_AGE_MIN + i,
      ),
    );
    expect(bars[2]).toEqual({ value: 2, count: 6, label: "age 2" });
    expect(bars[9]).toEqual({ value: 9, count: 1, label: "age 9" });
    expect(bars[0]).toEqual({ value: 0, count: 0, label: "age 0" });
  });

  it("still shows an age the form no longer accepts when it was counted", () => {
    const bars = buildAgeBars([{ value: 18, count: 2 }], ageLabel);

    expect(bars.at(-1)).toEqual({ value: 18, count: 2, label: "age 18" });
  });
});

describe("buildGenderBars", () => {
  it("shows both in the form's order, zeros included", () => {
    const bars = buildGenderBars([{ value: "girl", count: 3 }], genderLabel);

    expect(bars).toEqual([
      { value: "boy", count: 0, label: messages.genders.boy },
      { value: "girl", count: 3, label: messages.genders.girl },
    ]);
    expect(bars.map(({ value }) => value)).toEqual([...CHILD_GENDERS]);
  });
});
