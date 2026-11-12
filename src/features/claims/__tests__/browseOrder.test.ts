import { describe, expect, it } from "vitest";

import { browseOrderSeed } from "../browseOrder";

const volunteer = "0b9d4c1e-6f1a-4c39-9d7e-2a5b8e3f4c10";
const other = "7e2f9a3b-1c4d-4e5f-8a6b-9c0d1e2f3a4b";

describe("browseOrderSeed", () => {
  it("holds for the whole hour, so paging within it is stable", () => {
    expect(
      browseOrderSeed(volunteer, new Date("2026-11-12T14:00:00.000Z")),
    ).toBe(browseOrderSeed(volunteer, new Date("2026-11-12T14:59:59.999Z")));
  });

  it("changes when the hour does", () => {
    expect(
      browseOrderSeed(volunteer, new Date("2026-11-12T14:59:59.999Z")),
    ).not.toBe(
      browseOrderSeed(volunteer, new Date("2026-11-12T15:00:00.000Z")),
    );
  });

  it("differs between volunteers in the same hour", () => {
    const now = new Date("2026-11-12T14:30:00.000Z");
    expect(browseOrderSeed(volunteer, now)).not.toBe(
      browseOrderSeed(other, now),
    );
  });
});
