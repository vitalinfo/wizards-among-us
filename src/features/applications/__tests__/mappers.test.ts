import { describe, expect, it } from "vitest";

import type { applications } from "@/db/schema";

import { toBrowseCard } from "../mappers";

describe("toBrowseCard redaction (guardrail)", () => {
  it("exposes only non-sensitive fields and drops delivery/contact info", () => {
    const application: typeof applications.$inferSelect = {
      id: "app1",
      campaignId: "c1",
      parentId: "p1",
      parentName: "Ivan Petrenko",
      childName: "Olha Petrenko",
      childAge: 8,
      homeTown: "Bakhmut",
      homeRegion: "donetsk",
      currentTown: "Lviv",
      currentRegion: "lviv",
      displacedYear: 2022,
      familyStory: "…",
      contact: "olha_mama",
      contactMethod: "telegram",
      giftDescription: "Backpack",
      giftUrl: "https://rozetka.com.ua/ua/502764564/p502764564/",
      giftPrice: "1200.00",
      deliveryInformation: "Nova Poshta #5 — private",
      typeFields: null,
      status: "approved",
      rejectionNote: null,
      consentAt: new Date(),
      socialMediaConsent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const card = toBrowseCard(application);

    expect(card).toEqual({
      id: "app1",
      childFirstName: "Olha", // first name only, not the full name
      childAge: 8,
      currentRegion: "lviv",
      giftDescription: "Backpack",
      giftPrice: "1200.00",
      status: "approved",
    });
    // Anything a volunteer must not see before claiming. `contact` and
    // `giftUrl` are new with the St Nicholas form: the handle/phone is how a
    // stranger reaches the family, and the shop link is only needed once you've
    // actually claimed the child.
    for (const leaked of [
      "deliveryInformation",
      "currentTown",
      "parentName",
      "familyStory",
      "homeTown",
      "homeRegion",
      "contact",
      "contactMethod",
      "giftUrl",
      "consentAt",
      "socialMediaConsent",
    ]) {
      expect(leaked in card).toBe(false);
    }
  });
});
