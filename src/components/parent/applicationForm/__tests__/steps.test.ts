import { describe, expect, it } from "vitest";

import { stepsForCampaignType } from "../steps";

// Rendering must branch on campaign type the way validation already does.
// Without this, activating a New School Year campaign would silently show
// parents the St Nicholas form — asking for a letter to St Nicholas in a
// back-to-school campaign — and the passthrough type_fields schema wouldn't
// object.
describe("stepsForCampaignType", () => {
  it("returns the five-step form for St Nicholas", () => {
    const steps = stepsForCampaignType("saint_nicholas_day");
    expect(steps?.map((step) => step.key)).toEqual([
      "child",
      "family",
      "gift",
      "delivery",
      "consent",
    ]);
  });

  it("returns null for a campaign type with no form yet, rather than a wrong one", () => {
    expect(stepsForCampaignType("new_school_year")).toBeNull();
  });

  it("returns null when there's no campaign at all", () => {
    expect(stepsForCampaignType(null)).toBeNull();
    expect(stepsForCampaignType(undefined)).toBeNull();
  });
});
