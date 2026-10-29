import { describe, expect, it } from "vitest";

import {
  childAgeOptions,
  childGenderOptions,
  displacedYearOptions,
} from "@/lib/applicationFieldOptions";

import {
  applicationDraftFormSchema,
  applicationDraftSchema,
  applicationSubmitSchema,
  applicationSubmitSchemaForCampaign,
  exceedsGiftPriceCap,
  splitGiftUrls,
  stNicholasTypeFieldsSchema,
} from "../validation";

const validSubmit = {
  parentName: "Ivan",
  childName: "Olha",
  childAge: 8,
  childGender: "girl",
  homeTown: "Bakhmut",
  homeRegion: "donetsk",
  currentTown: "Lviv",
  currentRegion: "lviv",
  displacedYear: 2022,
  familyStory: "Our family relocated in 2022.",
  giftDescription: "A school backpack",
  giftPrice: 1200,
  deliveryInformation: "Nova Poshta #5, Lviv",
  privacyConsent: true,
  contactConsent: true,
  confirmationConsent: true,
  childWithLetterPhotoConsent: false,
  socialMediaConsent: false,
} as const;

describe("applicationSubmitSchema", () => {
  it("accepts a complete, valid submission", () => {
    expect(applicationSubmitSchema.safeParse(validSubmit).success).toBe(true);
  });

  it("requires each required consent to be true", () => {
    for (const key of [
      "privacyConsent",
      "contactConsent",
      "confirmationConsent",
    ]) {
      expect(
        applicationSubmitSchema.safeParse({ ...validSubmit, [key]: false })
          .success,
      ).toBe(false);
    }
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

  // Required at submit, and only the two values the picker offers. The browse
  // card draws an icon from it, so "unanswered" is not a state the card has.
  it("requires the child's gender, from the two values the picker offers", () => {
    const withoutGender: Record<string, unknown> = { ...validSubmit };
    delete withoutGender.childGender;
    expect(applicationSubmitSchema.safeParse(withoutGender).success).toBe(
      false,
    );
    expect(
      applicationSubmitSchema.safeParse({
        ...validSubmit,
        childGender: "other",
      }).success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, childGender: "" })
        .success,
    ).toBe(false);
    for (const { value } of childGenderOptions((key) => key)) {
      expect(
        applicationSubmitSchema.safeParse({
          ...validSubmit,
          childGender: value,
        }).success,
        `gender ${value}`,
      ).toBe(true);
    }
  });

  // A draft may not have answered yet, but a wrong answer is still refused —
  // the same rule the age follows.
  it("leaves the gender unsaved when a draft step sends it empty", () => {
    const parsed = applicationDraftFormSchema.parse({ childGender: "" });
    expect(parsed.childGender).toBeUndefined();
    expect(
      applicationDraftFormSchema.safeParse({ childGender: "other" }).success,
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

  // Narrowed to the occupied and front-line oblasts (Vital). Only the origin —
  // a displaced family can be living anywhere.
  it("accepts an origin only from the displaced-from list", () => {
    expect(
      applicationSubmitSchema.safeParse({ ...validSubmit, homeRegion: "lviv" })
        .success,
    ).toBe(false);
    expect(
      applicationSubmitSchema.safeParse({
        ...validSubmit,
        homeRegion: "crimea",
      }).success,
    ).toBe(true);
    // The place they live now is unrestricted.
    expect(
      applicationSubmitSchema.safeParse({
        ...validSubmit,
        currentRegion: "zakarpattia",
      }).success,
    ).toBe(true);
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
  it("accepts either answer for the optional consents", () => {
    for (const key of ["socialMediaConsent", "childWithLetterPhotoConsent"]) {
      for (const answer of [true, false]) {
        expect(
          applicationSubmitSchema.safeParse({ ...validSubmit, [key]: answer })
            .success,
        ).toBe(true);
      }
    }
  });

  it("still requires the optional consents to be answered", () => {
    for (const key of ["socialMediaConsent", "childWithLetterPhotoConsent"]) {
      const withoutAnswer: Record<string, unknown> = { ...validSubmit };
      delete withoutAnswer[key];
      expect(applicationSubmitSchema.safeParse(withoutAnswer).success).toBe(
        false,
      );
    }
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

// The step save and the final submit share this, so the gift step refuses what
// the submit would.
describe("exceedsGiftPriceCap", () => {
  it("flags only a price above the cap", () => {
    expect(exceedsGiftPriceCap(701, "700.00")).toBe(true);
    expect(exceedsGiftPriceCap(700, "700.00")).toBe(false);
  });

  it("has nothing to check without a price or a cap", () => {
    expect(exceedsGiftPriceCap(undefined, "700.00")).toBe(false);
    expect(exceedsGiftPriceCap(5000, null)).toBe(false);
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

  it("reads the child-photo consent checkbox as a real boolean", () => {
    expect(
      applicationDraftFormSchema.parse({ childWithLetterPhotoConsent: "true" })
        .childWithLetterPhotoConsent,
    ).toBe(true);
    expect(
      applicationDraftFormSchema.parse({ childWithLetterPhotoConsent: "false" })
        .childWithLetterPhotoConsent,
    ).toBe(false);
  });
});
