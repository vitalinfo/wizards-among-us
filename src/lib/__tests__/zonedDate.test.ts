import { describe, expect, it } from "vitest";

import {
  parseDateOnly,
  zonedEndOfDayExclusive,
  zonedStartOfDay,
  zonedEndOfDay,
  toZonedDateInput,
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

describe("zonedEndOfDay", () => {
  // The value a campaign's deadline is stored as: inside the day it names, so
  // formatting it back prints that day and not the next one.
  it("is the last millisecond of the day in Kyiv", () => {
    expect(zonedEndOfDay("2025-12-05").toISOString()).toBe(
      "2025-12-05T21:59:59.999Z",
    );
    expect(zonedEndOfDay("2026-09-01").toISOString()).toBe(
      "2026-09-01T20:59:59.999Z",
    );
  });

  // The whole point of not storing midnight: a deadline of «5 грудня» must not
  // be in the past for the whole of the fifth.
  it("is after every moment of its own day and before the next", () => {
    const end = zonedEndOfDay("2025-12-05");
    expect(end.getTime()).toBeGreaterThan(
      zonedStartOfDay("2025-12-05").getTime(),
    );
    expect(end.getTime()).toBeLessThan(zonedStartOfDay("2025-12-06").getTime());
  });
});

describe("toZonedDateInput", () => {
  // Round trip: what the admin typed is what the form shows them again.
  it("renders a stored deadline back as the day it names", () => {
    expect(toZonedDateInput(zonedEndOfDay("2025-12-05"))).toBe("2025-12-05");
    expect(toZonedDateInput(zonedEndOfDay("2026-09-01"))).toBe("2026-09-01");
  });

  // An instant that is one day in UTC and another in Kyiv — the case that makes
  // `toISOString().slice(0, 10)` wrong.
  it("reads the day in Kyiv, not in UTC", () => {
    expect(toZonedDateInput(new Date("2025-12-05T23:30:00.000Z"))).toBe(
      "2025-12-06",
    );
  });
});

// Regression: `Date.parse` rejects an impossible MONTH but rolls over an
// impossible DAY, so the NaN check this used to rely on let «31.02» through and
// filtered the queue by 3 March instead.
describe("parseDateOnly: impossible days", () => {
  it("rejects a day that does not exist in that month", () => {
    expect(parseDateOnly("2025-02-31")).toBeNull();
    expect(parseDateOnly("2026-02-29")).toBeNull();
    expect(parseDateOnly("2025-04-31")).toBeNull();
  });

  it("still accepts a real leap day", () => {
    expect(parseDateOnly("2024-02-29")).toBe("2024-02-29");
  });
});
