import { describe, expect, it } from "vitest";

import {
  adminLoginSchema,
  applicationDraftSchema,
  applicationSubmitSchema,
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

describe("adminLoginSchema", () => {
  it("normalizes email (trim + lowercase)", () => {
    const parsed = adminLoginSchema.parse({
      email: "  Admin@Example.COM ",
      password: "longenough",
    });
    expect(parsed.email).toBe("admin@example.com");
  });

  it("rejects an invalid email or a too-short password", () => {
    expect(
      adminLoginSchema.safeParse({ email: "nope", password: "longenough" })
        .success,
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({ email: "a@b.com", password: "short" })
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
