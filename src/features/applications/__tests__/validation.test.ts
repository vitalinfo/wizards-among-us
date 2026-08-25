import { describe, expect, it } from "vitest";

import {
  applicationDraftSchema,
  applicationSubmitSchema,
  applicationSubmitSchemaForCampaign,
  stNicholasTypeFieldsSchema,
} from "../validation";

const validSubmit = {
  parentName: "Ivan",
  childName: "Olha",
  childAge: 8,
  homeTown: "Bakhmut",
  homeRegion: "donetsk",
  currentTown: "Lviv",
  currentRegion: "lviv",
  displacedYear: 2022,
  familyStory: "Our family relocated in 2022.",
  giftDescription: "A school backpack",
  giftPrice: 1200,
  deliveryInformation: "Nova Poshta #5, Lviv",
  consent: true,
  socialMediaConsent: false,
} as const;

describe("applicationSubmitSchema", () => {
  it("accepts a complete, valid submission", () => {
    expect(applicationSubmitSchema.safeParse(validSubmit).success).toBe(true);
  });

  it("requires consent to be true", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, consent: false })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown region", () => {
    expect(
      applicationSubmitSchema.safeParse({
        ...validSubmit,
        currentRegion: "atlantis",
      }).success,
    ).toBe(false);
  });

  it("rejects a child age outside 0–18", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: 25 })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: -1 })
        .success,
    ).toBe(false);
  });

  it("rejects a displaced year outside 2014–current year", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, displacedYear: 2013 })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({
        ...validSubmit,
        displacedYear: new Date().getFullYear() + 1,
      }).success,
    ).toBe(false);
  });

  it("rejects blank required fields and a non-positive gift price", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childName: "   " })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, giftPrice: 0 })
        .success,
    ).toBe(false);
  });
});

describe("applicationDraftSchema", () => {
  it("accepts an empty draft", () => {
    expect(applicationDraftSchema.safeParse({}).success).toBe(true);
  });

  it("still validates the fields that are provided", () => {
    expect(
      applicationDraftSchema.safeParse({ currentRegion: "lviv" }).success,
    ).toBe(true);
    expect(applicationDraftSchema.safeParse({ childAge: 99 }).success).toBe(
      false,
    );
  });
});

describe("gift url (campaign type field) and social-media consent", () => {
  it("requires a real URL for the St Nicholas gift link", () => {
    expect(
      stNicholasTypeFieldsSchema.safeParse({ giftUrl: "rozetka" }).success,
    ).toBe(false);
    expect(
      stNicholasTypeFieldsSchema.safeParse({
        giftUrl: "https://rozetka.com.ua/ua/502764564/p502764564/",
      }).success,
    ).toBe(true);
  });

  // Required to ANSWER, but "no" is a valid answer — it must never be a
  // literal(true) like the data-processing consent.
  it("accepts either answer for social-media consent", () => {
    for (const socialMediaConsent of [true, false]) {
      expect(
        applicationSubmitSchema.safeParse({
          ...validSubmit,
          socialMediaConsent,
        }).success,
      ).toBe(true);
    }
  });

  it("still requires social-media consent to be answered", () => {
    const withoutAnswer: Record<string, unknown> = { ...validSubmit };
    delete withoutAnswer.socialMediaConsent;
    expect(applicationSubmitSchema.safeParse(withoutAnswer).success).toBe(
      false,
    );
  });
});

describe("applicationSubmitSchemaForCampaign (gift budget cap)", () => {
  it("rejects a gift over the campaign cap", () => {
    const schema = applicationSubmitSchemaForCampaign({
      giftPriceCap: "700.00",
    });
    expect(schema.safeParse({ ...validSubmit, giftPrice: 701 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ ...validSubmit, giftPrice: 700 }).success).toBe(
      true,
    );
  });

  it("imposes no cap when the campaign has none", () => {
    const schema = applicationSubmitSchemaForCampaign({ giftPriceCap: null });
    expect(schema.safeParse({ ...validSubmit, giftPrice: 5000 }).success).toBe(
      true,
    );
  });
});
