import { describe, expect, it } from "vitest";

import {
  initialStep,
  missingStepUploads,
  stepsForCampaignType,
} from "../steps";

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
  // Every upload the form asks for. A step is only finished when its fields
  // AND its uploads are there.
  const allUploads = steps.flatMap((step) => step.uploads ?? []);

  it("resumes a draft at the first step with a missing answer", () => {
    const partial = { ...complete };
    for (const field of steps[2].fields) {
      delete partial[field];
    }
    expect(initialStep(steps, partial, "draft", allUploads)).toBe(2);
  });

  // A complete draft is about to be submitted, so the last step is where the
  // parent wants to be.
  it("puts a complete draft on the last step, where the submit is", () => {
    expect(initialStep(steps, complete, "draft", allUploads)).toBe(
      steps.length - 1,
    );
  });

  // The regression: a submitted application has no incomplete step, so
  // "first incomplete" fell through to the LAST one — consent and a captcha —
  // when the link said «Переглянути або змінити».
  it("opens a submitted application at the first step", () => {
    expect(initialStep(steps, complete, "submitted", allUploads)).toBe(0);
  });

  it("opens every non-draft status at the first step", () => {
    for (const status of [
      "approved",
      "claimed",
      "fulfilled",
      "rejected",
    ] as const) {
      expect(initialStep(steps, complete, status, allUploads)).toBe(0);
    }
  });
});

// A step is not finished just because its text fields are filled. Counting
// fields alone sent a parent whose photos were missing straight to the last
// step, only to be refused there — the long way round to discovering they had
// never uploaded anything.
describe("initialStep counts uploads too", () => {
  const steps = stepsForCampaignType("saint_nicholas_day")!;
  const complete = Object.fromEntries(
    steps.flatMap((step) => step.fields.map((field) => [field, "x"])),
  );
  const familyStep = steps.findIndex((step) => step.key === "family");
  const giftStep = steps.findIndex((step) => step.key === "gift");

  it("stops at the step whose upload is missing", () => {
    expect(initialStep(steps, complete, "draft", [])).toBe(familyStep);
  });

  it("moves on once that step's upload is there", () => {
    expect(initialStep(steps, complete, "draft", ["idp_certificate"])).toBe(
      giftStep,
    );
  });

  it("needs BOTH photos before leaving the gift step", () => {
    expect(
      initialStep(steps, complete, "draft", [
        "idp_certificate",
        "letter_photo",
      ]),
    ).toBe(giftStep);
  });
});

describe("missingStepUploads", () => {
  const steps = stepsForCampaignType("saint_nicholas_day")!;
  const gift = steps.find((step) => step.key === "gift")!;
  const child = steps.find((step) => step.key === "child")!;

  it("names what a step is still waiting for", () => {
    expect(missingStepUploads(gift, ["letter_photo"])).toEqual([
      "child_with_letter_photo",
    ]);
  });

  it("is empty for a step that asks for no uploads", () => {
    expect(missingStepUploads(child, [])).toEqual([]);
  });
});
