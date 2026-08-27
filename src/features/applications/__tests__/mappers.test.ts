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
      giftDescription: "Backpack",
      giftPrice: "1200.00",
      deliveryInformation: "Nova Poshta #5 — private",
      typeFields: {
        giftUrl: "https://rozetka.com.ua/ua/502764564/p502764564/",
      },
      status: "approved",
      rejectionNote: null,
      submittedAt: new Date(),
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
    // Anything a volunteer must not see before claiming. typeFields carries the
    // St Nicholas shop link, which is only needed once you've actually claimed
    // the child.
    for (const leaked of [
      "deliveryInformation",
      "currentTown",
      "parentName",
      "familyStory",
      "homeTown",
      "homeRegion",
      "typeFields",
      "submittedAt",
      "socialMediaConsent",
    ]) {
      expect(leaked in card).toBe(false);
    }
  });
});
