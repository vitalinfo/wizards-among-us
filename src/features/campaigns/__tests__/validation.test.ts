import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";

import { CAMPAIGN_TYPES, CREATABLE_CAMPAIGN_TYPES } from "@/db/enums";
import { formats, locale, timeZone } from "@/i18n/config";

import { campaignCreateSchema, campaignUpdateSchema } from "../validation";

const base = {
  title: "Святий Миколай 2026",
  description: "",
  giftPriceCap: "",
  endsAt: "",
};

// "We no longer offer this type" and "this type never existed" are different
// claims, and only the first is true. The enum stays wide so historical rows
// keep their real type; the CREATE path is what narrows.
describe("campaign type: create vs edit", () => {
  it("creating is restricted to the types we still offer", () => {
    expect(
      campaignCreateSchema.safeParse({ ...base, type: "saint_nicholas_day" })
        .success,
    ).toBe(true);
    // Retired: still a valid CampaignType, but not creatable.
    expect(
      campaignCreateSchema.safeParse({ ...base, type: "new_school_year" })
        .success,
    ).toBe(false);
  });

  // An archived new_school_year campaign submits its own type back as a hidden
  // field. Rejecting it would make that row impossible to rename.
  it("editing still accepts a historical type", () => {
    expect(
      campaignUpdateSchema.safeParse({ ...base, type: "new_school_year" })
        .success,
    ).toBe(true);
  });

  it("neither accepts a type that was never real", () => {
    for (const schema of [campaignCreateSchema, campaignUpdateSchema]) {
      expect(schema.safeParse({ ...base, type: "birthday" }).success).toBe(
        false,
      );
    }
  });

  // The creatable list must stay a subset, or the select would offer something
  // the server refuses.
  it("every creatable type is a real campaign type", () => {
    for (const type of CREATABLE_CAMPAIGN_TYPES) {
      expect(CAMPAIGN_TYPES).toContain(type);
    }
  });
});

// The deadline the claim briefing prints. It arrives as a calendar date and is
// stored as an instant, so the only thing worth asserting is which instant.
describe("campaign deadline", () => {
  const parse = (endsAt: string) =>
    campaignCreateSchema.safeParse({
      ...base,
      type: "saint_nicholas_day",
      endsAt,
    });

  it("stores the END of the named day in Kyiv", () => {
    const result = parse("2025-12-05");
    expect(result.success).toBe(true);
    // Midnight would put «не пізніше 5 грудня» in the past for all of the 5th,
    // and the next day's midnight would print as «6 грудня».
    expect(result.success ? result.data.endsAt?.toISOString() : null).toBe(
      "2025-12-05T21:59:59.999Z",
    );
  });

  // Blank is a real answer, not a validation failure: a campaign may have no
  // deadline, and the briefing drops the whole block when it does not.
  it("treats a blank field as no deadline", () => {
    const result = parse("");
    expect(result.success).toBe(true);
    expect(result.success ? result.data.endsAt : undefined).toBeNull();
  });

  it("rejects a date that is not one", () => {
    expect(parse("05.12.2025").success).toBe(false);
    // Shaped right, not a real day — Date.parse says NaN and so do we.
    expect(parse("2025-02-31").success).toBe(false);
  });

  it("applies on edit as well as on create", () => {
    const result = campaignUpdateSchema.safeParse({
      ...base,
      type: "new_school_year",
      endsAt: "2026-09-01",
    });
    expect(result.success ? result.data.endsAt?.toISOString() : null).toBe(
      "2026-09-01T20:59:59.999Z",
    );
  });
});

// The round trip the whole end-of-day decision rests on: what an admin types
// into the campaign form is what a volunteer reads on «Перед тим як стати
// Чарівником». The briefing formats `endsAt` with exactly this formatter, so a
// stored instant that lands on the wrong side of midnight would print the wrong
// day with nothing failing anywhere else.
describe("deadline round trip: typed date → briefing copy", () => {
  const format = createFormatter({ locale, timeZone, formats });

  const briefingDate = (typed: string) => {
    const result = campaignCreateSchema.safeParse({
      ...base,
      type: "saint_nicholas_day",
      endsAt: typed,
    });
    const endsAt = result.success ? result.data.endsAt : null;
    return endsAt
      ? format.dateTime(endsAt, { day: "numeric", month: "long" })
      : null;
  };

  it("prints the day the admin named, in winter and in summer", () => {
    // The design's own example.
    expect(briefingDate("2025-12-05")).toBe("5 грудня");
    // Kyiv is UTC+3 here, so a midnight-UTC value would print the day before.
    expect(briefingDate("2026-09-01")).toBe("1 вересня");
  });

  it("does not spill into the next day at a month end", () => {
    expect(briefingDate("2025-12-31")).toBe("31 грудня");
  });
});
