import { describe, expect, it } from "vitest";

import {
  parseDateOnly,
  zonedEndOfDayExclusive,
  zonedStartOfDay,
} from "../zonedDate";

describe("parseDateOnly", () => {
  it("accepts what <input type=date> submits", () => {
    expect(parseDateOnly("2026-09-01")).toBe("2026-09-01");
  });

  // A bad date in a url must never be able to blank the queue.
  it("treats anything else as absent", () => {
    expect(parseDateOnly(undefined)).toBeNull();
    expect(parseDateOnly("")).toBeNull();
    expect(parseDateOnly("01.09.2026")).toBeNull();
    expect(parseDateOnly("2026-13-45")).toBeNull();
    expect(parseDateOnly("2026-09-01T10:00:00Z")).toBeNull();
  });
});

// The bug this exists to prevent: UTC midnight on 1 September is 03:00 in Kyiv,
// so filtering «з 01.09» against it drops every application submitted in the
// first three hours of that day.
describe("zonedStartOfDay", () => {
  it("is midnight in Kyiv, not in UTC", () => {
    // Summer: Kyiv is UTC+3.
    expect(zonedStartOfDay("2026-09-01").toISOString()).toBe(
      "2026-08-31T21:00:00.000Z",
    );
    // Winter: UTC+2.
    expect(zonedStartOfDay("2026-01-15").toISOString()).toBe(
      "2026-01-14T22:00:00.000Z",
    );
  });

  it("handles the days either side of a DST change", () => {
    // Ukraine springs forward on the last Sunday of March.
    expect(zonedStartOfDay("2026-03-28").toISOString()).toBe(
      "2026-03-27T22:00:00.000Z",
    );
    expect(zonedStartOfDay("2026-03-29").toISOString()).toBe(
      "2026-03-28T22:00:00.000Z",
    );
    expect(zonedStartOfDay("2026-03-30").toISOString()).toBe(
      "2026-03-29T21:00:00.000Z",
    );
  });
});

describe("zonedEndOfDayExclusive", () => {
  // Half-open: «по 01.09» has to INCLUDE the first of September.
  it("is the start of the next day", () => {
    expect(zonedEndOfDayExclusive("2026-09-01").toISOString()).toBe(
      "2026-09-01T21:00:00.000Z",
    );
  });

  it("rolls over a month and a year end", () => {
    expect(zonedEndOfDayExclusive("2026-08-31").toISOString()).toBe(
      "2026-08-31T21:00:00.000Z",
    );
    expect(zonedEndOfDayExclusive("2026-12-31").toISOString()).toBe(
      "2026-12-31T22:00:00.000Z",
    );
  });

  // A spring-forward day is 23 hours long, so advancing by a fixed 86,400,000ms
  // would land an hour into the next day.
  it("advances by a calendar day, not by 24 hours", () => {
    const start = zonedStartOfDay("2026-03-29");
    const end = zonedEndOfDayExclusive("2026-03-29");
    expect(end.getTime() - start.getTime()).toBe(23 * 60 * 60 * 1000);
  });
});
