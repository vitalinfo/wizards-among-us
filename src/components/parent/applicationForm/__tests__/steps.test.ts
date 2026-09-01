import { describe, expect, it } from "vitest";

import { initialStep, stepsForCampaignType } from "../steps";

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

// Where the form OPENS depends on why the parent is here, and getting it wrong
// is how a parent reviewing a submitted application lands on a captcha.
describe("initialStep", () => {
  const steps = stepsForCampaignType("saint_nicholas_day")!;
  const complete = Object.fromEntries(
    steps.flatMap((step) => step.fields.map((field) => [field, "x"])),
  );

  it("resumes a draft at the first step with a missing answer", () => {
    const partial = { ...complete };
    for (const field of steps[2].fields) {
      delete partial[field];
    }
    expect(initialStep(steps, partial, "draft")).toBe(2);
  });

  // A complete draft is about to be submitted, so the last step is where the
  // parent wants to be.
  it("puts a complete draft on the last step, where the submit is", () => {
    expect(initialStep(steps, complete, "draft")).toBe(steps.length - 1);
  });

  // The regression: a submitted application has no incomplete step, so
  // "first incomplete" fell through to the LAST one — consent and a captcha —
  // when the link said «Переглянути або змінити».
  it("opens a submitted application at the first step", () => {
    expect(initialStep(steps, complete, "submitted")).toBe(0);
  });

  it("opens every non-draft status at the first step", () => {
    for (const status of [
      "approved",
      "claimed",
      "fulfilled",
      "rejected",
    ] as const) {
      expect(initialStep(steps, complete, status)).toBe(0);
    }
  });
});
