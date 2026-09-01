import { describe, expect, it } from "vitest";

import {
  CHILD_AGE_MAX,
  CHILD_AGE_MIN,
  childAgeOptions,
  currentYear,
  DISPLACED_YEAR_MIN,
  displacedYearOptions,
} from "../applicationFieldOptions";

describe("childAgeOptions", () => {
  it("offers every age the form accepts, and nothing else", () => {
    const options = childAgeOptions();

    expect(options.at(0)).toEqual({ value: "0", label: "0" });
    expect(options.at(-1)).toEqual({ value: "17", label: "17" });
    expect(options).toHaveLength(CHILD_AGE_MAX - CHILD_AGE_MIN + 1);
  });
});

describe("displacedYearOptions", () => {
  it("runs from the start of the war to the given year", () => {
    const options = displacedYearOptions(2026);

    expect(options.at(0)?.value).toBe(String(DISPLACED_YEAR_MIN));
    expect(options.at(-1)?.value).toBe("2026");
    expect(options).toHaveLength(2026 - DISPLACED_YEAR_MIN + 1);
  });

  it("defaults to the current year", () => {
    expect(displacedYearOptions().at(-1)?.value).toBe(String(currentYear()));
  });

  // Guards a clock skewed before 2014 (or a wrong DISPLACED_YEAR_MIN) turning
  // the list inside out and leaving the parent with nothing to pick.
  it("never produces an empty list", () => {
    expect(displacedYearOptions(2000)).toEqual([
      { value: "2014", label: "2014" },
    ]);
  });
});
