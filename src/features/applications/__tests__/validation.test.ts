import { describe, expect, it } from "vitest";

import {
  applicationDraftSchema,
  applicationSubmitSchema,
  applicationSubmitSchemaForCampaign,
  contactSchema,
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
  contactMethod: "telegram",
  contact: "@olha_mama",
  giftDescription: "A school backpack",
  giftUrl: "https://rozetka.com.ua/ua/502764564/p502764564/",
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

// The contact is how a volunteer reaches the family about a child's gift, so a
// handle stored in the phone field (or vice versa) is a dead end at the worst
// possible moment — validate per method, not just "non-empty".
describe("contactSchema", () => {
  it("accepts a Telegram handle and strips a leading @", () => {
    const parsed = contactSchema.parse({
      contactMethod: "telegram",
      contact: "  @olha_mama ",
    });
    expect(parsed.contact).toBe("olha_mama");
  });

  it("accepts a Ukrainian phone and strips formatting", () => {
    const parsed = contactSchema.parse({
      contactMethod: "phone",
      contact: "+380 (67) 123-45-67",
    });
    expect(parsed.contact).toBe("+380671234567");
  });

  it("rejects a phone number entered as a Telegram handle", () => {
    expect(
      contactSchema.safeParse({
        contactMethod: "telegram",
        contact: "+380671234567",
      }).success,
    ).toBe(false);
  });

  it("rejects a handle entered as a phone number", () => {
    expect(
      contactSchema.safeParse({ contactMethod: "phone", contact: "@olha_mama" })
        .success,
    ).toBe(false);
  });

  it("rejects a too-short handle and a non-Ukrainian number", () => {
    expect(
      contactSchema.safeParse({ contactMethod: "telegram", contact: "@ab" })
        .success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({
        contactMethod: "phone",
        contact: "+15551234567",
      }).success,
    ).toBe(false);
  });
});

describe("gift url and social-media consent", () => {
  it("requires a real URL for the gift link", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, giftUrl: "rozetka" })
        .success,
    ).toBe(false);
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
