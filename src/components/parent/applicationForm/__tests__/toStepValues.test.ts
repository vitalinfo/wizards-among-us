import { describe, expect, it } from "vitest";

import type { ApplicationRow } from "../types";
import { toStepValues } from "../types";

const row = {
  id: "a1",
  campaignId: "c1",
  parentId: "p1",
  parentName: "Оксана",
  childName: "Оля",
  childAge: 7,
  homeTown: "Дружківка",
  homeRegion: "donetsk",
  currentTown: "Львів",
  currentRegion: "lviv",
  displacedYear: 2022,
  familyStory: "…",
  giftDescription: "Лялька",
  giftPrice: "650.00",
  deliveryInformation: "НП №5",
  typeFields: {
    giftUrls: ["https://rozetka.com.ua/ua/1/p1/", "https://epicentrk.ua/ua/x"],
  },
  status: "draft",
  rejectionNote: null,
  submittedAt: null,
  socialMediaConsent: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} as ApplicationRow;

describe("toStepValues", () => {
  // type_fields is jsonb, but the form treats a campaign-specific field as just
  // another named input — so it has to arrive flattened alongside the columns.
  it("flattens type_fields alongside the columns", () => {
    expect(toStepValues(row).childName).toBe("Оля");
  });

  // The links are stored as an array but edited in a textarea, so they have to
  // round-trip as one per line.
  it("renders a list of links one per line for the textarea", () => {
    expect(toStepValues(row).giftUrls).toBe(
      "https://rozetka.com.ua/ua/1/p1/\nhttps://epicentrk.ua/ua/x",
    );
  });

  // Radios compare against strings; a raw boolean would never match and the
  // parent's saved answer would silently appear unanswered.
  it("renders booleans as strings so a radio can preselect", () => {
    expect(toStepValues(row).socialMediaConsent).toBe("false");
    expect(
      toStepValues({ ...row, socialMediaConsent: true }).socialMediaConsent,
    ).toBe("true");
  });

  it("maps nulls to undefined and drops non-form values like dates", () => {
    const values = toStepValues({ ...row, childName: null });
    expect(values.childName).toBeUndefined();
    expect(values.createdAt).toBeUndefined();
  });
});
