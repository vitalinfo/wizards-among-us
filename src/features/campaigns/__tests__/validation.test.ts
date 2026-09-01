import { describe, expect, it } from "vitest";

import { CAMPAIGN_TYPES, CREATABLE_CAMPAIGN_TYPES } from "@/db/enums";

import { campaignCreateSchema, campaignUpdateSchema } from "../validation";

const base = {
  title: "Святий Миколай 2026",
  description: "",
  giftPriceCap: "",
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
