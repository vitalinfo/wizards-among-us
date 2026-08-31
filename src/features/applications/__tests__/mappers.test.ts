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
      familyStory: "Виїхали з Дружківки навесні 2022.",
      giftDescription: "Backpack",
      giftPrice: "1200.00",
      deliveryInformation: "Nova Poshta #5 — private",
      typeFields: {
        giftUrls: ["https://rozetka.com.ua/ua/502764564/p502764564/"],
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
      homeRegion: "donetsk",
      homeTown: "Bakhmut",
      giftDescription: "Backpack",
      giftPrice: "1200.00",
      // On the card by a deliberate decision (Vital, Phase 6): it is what a
      // volunteer chooses on, and the parent form already tells families it is
      // read by the wizard who will be choosing.
      familyStory: "Виїхали з Дружківки навесні 2022.",
      status: "approved",
    });
    // Anything a volunteer must not see before claiming. CURRENT town, the
    // address, the parent's name and the contact stay post-claim — widening
    // tier 1 to the story and to the family's ORIGIN did not widen it to these.
    // current_town is the one that matters most: origin is where they no longer
    // are, but the current town is where the child can actually be found. typeFields carries the
    // St Nicholas shop link, which is only needed once you've actually claimed
    // the child.
    for (const leaked of [
      "deliveryInformation",
      "currentTown",
      "parentName",
      "typeFields",
      "submittedAt",
      "socialMediaConsent",
    ]) {
      expect(leaked in card).toBe(false);
    }
  });
});
