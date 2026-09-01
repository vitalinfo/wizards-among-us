import { describe, expect, it } from "vitest";

import {
  childAgeOptions,
  displacedYearOptions,
} from "@/lib/applicationFieldOptions";

import {
  applicationDraftFormSchema,
  applicationDraftSchema,
  applicationSubmitSchema,
  applicationSubmitSchemaForCampaign,
  splitGiftUrls,
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

  it("rejects a child age outside 0–17", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: 25 })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: -1 })
        .success,
    ).toBe(false);
    // 18 is the boundary the <select> stops at — the initiative is for children.
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: 18 })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childAge: 17 })
        .success,
    ).toBe(true);
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

  it("accepts every value the age and year <select>s offer", () => {
    for (const { value } of childAgeOptions()) {
      const parsed = applicationSubmitSchema.safeParse({
        ...validSubmit,
        childAge: Number(value),
      });
      expect(parsed.success, `age ${value}`).toBe(true);
    }

    for (const { value } of displacedYearOptions()) {
      const parsed = applicationSubmitSchema.safeParse({
        ...validSubmit,
        displacedYear: Number(value),
      });
      expect(parsed.success, `year ${value}`).toBe(true);
    }
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

describe("gift links (campaign type field) and social-media consent", () => {
  const link = "https://rozetka.com.ua/ua/502764564/p502764564/";
  const other = "https://epicentrk.ua/ua/shop/item.html";

  // A wish is often two or three small things under one budget, so the links
  // are a LIST while the price stays a single total.
  it("accepts several links, one per line, and keeps their order", () => {
    const parsed = stNicholasTypeFieldsSchema.parse({
      giftUrls: `${link}\n${other}`,
    });
    expect(parsed.giftUrls).toEqual([link, other]);
  });

  it("also accepts comma-separated links and an already-parsed array", () => {
    expect(
      stNicholasTypeFieldsSchema.parse({ giftUrls: `${link}, ${other}` })
        .giftUrls,
    ).toEqual([link, other]);
    expect(
      stNicholasTypeFieldsSchema.parse({ giftUrls: [link] }).giftUrls,
    ).toEqual([link]);
  });

  it("rejects the whole list if any entry isn't a real URL", () => {
    expect(
      stNicholasTypeFieldsSchema.safeParse({ giftUrls: `${link}\nrozetka` })
        .success,
    ).toBe(false);
    expect(stNicholasTypeFieldsSchema.safeParse({ giftUrls: "" }).success).toBe(
      false,
    );
  });

  it("ignores blank lines and stray separators from pasting", () => {
    expect(splitGiftUrls(`\n${link}\n\n , ${other} ;\n`)).toEqual([
      link,
      other,
    ]);
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

// A <form> sends "" for an untouched field. Naive coercion turns that into 0,
// which would silently record a child's age as 0 — the reason this schema
// preprocesses blanks to undefined.
describe("applicationDraftFormSchema (FormData coercion)", () => {
  it("treats an untouched field as absent, not as 0 or an empty string", () => {
    const parsed = applicationDraftFormSchema.parse({
      childName: "Оля",
      childAge: "",
      homeTown: "   ",
    });
    expect(parsed.childName).toBe("Оля");
    expect(parsed.childAge).toBeUndefined();
    expect(parsed.homeTown).toBeUndefined();
  });

  it("coerces numeric strings the browser sends", () => {
    const parsed = applicationDraftFormSchema.parse({
      childAge: "7",
      displacedYear: "2022",
      giftPrice: "699.50",
    });
    expect(parsed.childAge).toBe(7);
    expect(parsed.displacedYear).toBe(2022);
    expect(parsed.giftPrice).toBe(699.5);
  });

  it("still rejects a provided value that is out of range", () => {
    expect(
      applicationDraftFormSchema.safeParse({ childAge: "99" }).success,
    ).toBe(false);
    expect(
      applicationDraftFormSchema.safeParse({ giftUrls: "rozetka" }).success,
    ).toBe(false);
    expect(
      applicationDraftFormSchema.safeParse({ homeRegion: "atlantis" }).success,
    ).toBe(false);
  });

  it("reads the social-media consent radio as a real boolean", () => {
    expect(
      applicationDraftFormSchema.parse({ socialMediaConsent: "true" })
        .socialMediaConsent,
    ).toBe(true);
    expect(
      applicationDraftFormSchema.parse({ socialMediaConsent: "false" })
        .socialMediaConsent,
    ).toBe(false);
    expect(
      applicationDraftFormSchema.parse({}).socialMediaConsent,
    ).toBeUndefined();
  });
});
