import { describe, expect, it } from "vitest";

import { describeChangedFields } from "../adminEdit";
import { adminApplicationEditSchema } from "../validation";

// A minimal row shaped like a submitted application.
const row = {
  id: "a",
  childName: "Софійка",
  childAge: 7,
  homeTown: "Бахмут",
  homeRegion: "donetsk",
  currentTown: "Львів",
  currentRegion: "lviv",
  displacedYear: 2022,
  parentName: "Олена",
  familyStory: "Історія",
  giftDescription: "Лялька",
  giftPrice: "1200.00",
  deliveryInformation: "Нова пошта 12",
  socialMediaConsent: true,
  typeFields: { giftUrls: ["https://example.com/a"] },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
} as any;

const complete = {
  parentName: "Олена",
  childName: "Софійка",
  childAge: "7",
  homeTown: "Бахмут",
  homeRegion: "donetsk",
  currentTown: "Львів",
  currentRegion: "lviv",
  displacedYear: "2022",
  familyStory: "Історія",
  giftDescription: "Лялька",
  giftPrice: "1200",
  deliveryInformation: "Нова пошта 12",
  socialMediaConsent: "true",
  giftUrls: "https://example.com/a",
};

const forSubmitted = adminApplicationEditSchema({
  requireComplete: true,
  campaignType: "saint_nicholas_day",
  giftPriceCap: "700.00",
  currentGiftPrice: null,
});
const forDraft = adminApplicationEditSchema({
  requireComplete: false,
  campaignType: "saint_nicholas_day",
  giftPriceCap: null,
  currentGiftPrice: null,
});

describe("adminApplicationEditSchema", () => {
  it("accepts a complete edit", () => {
    const result = adminApplicationEditSchema({
      requireComplete: true,
      campaignType: "saint_nicholas_day",
      giftPriceCap: null,
      currentGiftPrice: null,
    }).safeParse(complete);
    expect(result.success).toBe(true);
  });

  // Caps change mid-campaign. An application submitted under an older, higher
  // cap must stay fixable: an admin correcting a delivery address must not be
  // blocked by a price they never touched.
  it("does not enforce the cap on a price the admin left alone", () => {
    const schema = adminApplicationEditSchema({
      requireComplete: true,
      campaignType: "saint_nicholas_day",
      giftPriceCap: "700.00",
      currentGiftPrice: "1200.00",
    });
    // Same price as stored, different address — allowed.
    expect(
      schema.safeParse({
        ...complete,
        deliveryInformation: "Нова пошта 44",
      }).success,
    ).toBe(true);
    // Raising it further is still refused.
    expect(schema.safeParse({ ...complete, giftPrice: "1300" }).success).toBe(
      false,
    );
  });

  // An application past draft was submitted whole; an admin must not be able to
  // blank out a field a volunteer is relying on.
  it("refuses to blank a required field on a submitted application", () => {
    const result = forSubmitted.safeParse({
      ...complete,
      deliveryInformation: "",
      giftPrice: "500",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (i) =>
            i.path[0] === "deliveryInformation" && i.message === "required",
        ),
      ).toBe(true);
    }
  });

  // A draft legitimately has holes — that's what a draft is.
  it("allows empty fields on a draft", () => {
    const result = forDraft.safeParse({ childName: "Софійка" });
    expect(result.success).toBe(true);
  });

  it("still applies the parent's field rules", () => {
    // Age 99 is rejected for an admin exactly as it is for a parent.
    expect(forDraft.safeParse({ childAge: "99" }).success).toBe(false);
    expect(forDraft.safeParse({ displacedYear: "1990" }).success).toBe(false);
    expect(forDraft.safeParse({ giftPrice: "-5" }).success).toBe(false);
  });

  it("enforces the campaign gift cap", () => {
    const result = forSubmitted.safeParse(complete); // 1200 over a 700 cap
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "gift_price_over_cap"),
      ).toBe(true);
    }
  });

  // The shop link is what a volunteer actually buys from.
  it("requires a shop link for a submitted St Nicholas application", () => {
    const result = forSubmitted.safeParse({
      ...complete,
      giftPrice: "500",
      giftUrls: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "giftUrls")).toBe(
        true,
      );
    }
  });

  // "" from a <select> must mean "unanswered", not "No" — the parent form's
  // preprocess would have turned it into false.
  it("treats an unanswered social-media consent as unset, not No", () => {
    const result = forDraft.safeParse({ socialMediaConsent: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.socialMediaConsent).toBeUndefined();
    }
    const no = forDraft.safeParse({ socialMediaConsent: "false" });
    expect(no.success && no.data.socialMediaConsent).toBe(false);
  });
});

// The audit trail records field NAMES, never values: these fields hold a child's
// address and the family's story, and audit_logs must not become a second copy
// of that data.
describe("describeChangedFields", () => {
  it("lists only what actually changed", () => {
    expect(
      describeChangedFields(row, { childName: "Софійка", childAge: 8 }),
    ).toBe("childAge");
  });

  it("returns empty when nothing changed", () => {
    expect(
      describeChangedFields(row, {
        childName: "Софійка",
        giftPrice: 1200,
        socialMediaConsent: true,
      }),
    ).toBe("");
  });

  it("compares gift urls through type_fields", () => {
    expect(
      describeChangedFields(row, { giftUrls: ["https://example.com/b"] }),
    ).toBe("giftUrls");
    expect(
      describeChangedFields(row, { giftUrls: ["https://example.com/a"] }),
    ).toBe("");
  });

  it("never includes a value", () => {
    const changed = describeChangedFields(row, {
      deliveryInformation: "вул. Приватна 5",
      familyStory: "дуже особиста історія",
    });
    expect(changed).toBe("deliveryInformation,familyStory");
    expect(changed).not.toContain("Приватна");
    expect(changed).not.toContain("історія");
  });
});
