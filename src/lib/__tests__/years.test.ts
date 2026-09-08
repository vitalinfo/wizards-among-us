import { describe, expect, it } from "vitest";

import { yearsSince } from "../years";

describe("yearsSince", () => {
  it("counts whole years from the given year", () => {
    expect(yearsSince(2022, new Date("2026-09-08T12:00:00Z"))).toBe(4);
    expect(yearsSince(2022, new Date("2022-06-01T12:00:00Z"))).toBe(0);
  });

  it("rolls over on Kyiv's new year, not the server's", () => {
    // 22:30 UTC on 31 December is already 00:30 on 1 January in Kyiv (UTC+2).
    // A server running in UTC — which Heroku does — would still say 2026.
    expect(yearsSince(2022, new Date("2026-12-31T22:30:00Z"))).toBe(5);
    expect(yearsSince(2022, new Date("2026-12-31T21:30:00Z"))).toBe(4);
  });

  it("never goes negative", () => {
    expect(yearsSince(2030, new Date("2026-09-08T12:00:00Z"))).toBe(0);
  });
});
