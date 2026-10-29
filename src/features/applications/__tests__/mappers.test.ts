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
      childGender: "girl",
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
      childWithLetterPhotoConsent: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const card = toBrowseCard(application, "file-1");

    expect(card).toEqual({
      id: "app1",
      childName: "Olha Petrenko",
      childAge: 8,
      // Tier 1 by decision (Vital): it draws the child's icon, and the first
      // name beside it already discloses it.
      childGender: "girl",
      homeRegion: "donetsk",
      homeTown: "Bakhmut",
      giftDescription: "Backpack",
      // Both moved onto the pre-claim card with the 118:420 redesign (Vital),
      // and §4.3 moved with them.
      giftUrls: ["https://rozetka.com.ua/ua/502764564/p502764564/"],
      letterPhotoId: "file-1",
      // On the card by a deliberate decision (Vital, Phase 6): it is what a
      // volunteer chooses on, and the parent form already tells families it is
      // read by the wizard who will be choosing.
      familyStory: "Виїхали з Дружківки навесні 2022.",
      status: "approved",
    });
    // Anything a volunteer must not see before claiming. The delivery address,
    // the parent's name and the contact stay post-claim; so does the family's
    // CURRENT town, which the 118:420 redesign took back off the card. Note
    // `typeFields` itself must still not be here — the shop links are now on
    // the card, but as a checked list of http(s) urls, not as the raw jsonb
    // blob, which is where a future campaign type will put something else.
    for (const leaked of [
      "deliveryInformation",
      "parentName",
      "typeFields",
      "currentTown",
      "currentRegion",
      "submittedAt",
      "socialMediaConsent",
    ]) {
      expect(leaked in card).toBe(false);
    }
  });
});

// The shop links reach a page every signed-in volunteer can open, so what comes
// out of type_fields is checked rather than trusted: zod's `.url()` accepts
// anything the URL constructor does, `javascript:` included, and an application
// recorded before that validation existed went through no check at all.
describe("toBrowseCard gift links", () => {
  const withTypeFields = (typeFields: unknown) =>
    toBrowseCard({
      id: "a1",
      childName: "Olha",
      typeFields,
    } as unknown as typeof applications.$inferSelect).giftUrls;

  it("keeps http and https links", () => {
    expect(
      withTypeFields({
        giftUrls: ["https://rozetka.com.ua/p/", "http://shop.example/x"],
      }),
    ).toEqual(["https://rozetka.com.ua/p/", "http://shop.example/x"]);
  });

  it("drops a javascript: url, which zod's .url() accepts", () => {
    expect(withTypeFields({ giftUrls: ["javascript:alert(1)"] })).toEqual([]);
    expect(
      withTypeFields({
        giftUrls: ["https://ok.example/", "javascript:alert(1)"],
      }),
    ).toEqual(["https://ok.example/"]);
  });

  it("survives a type_fields that is not the shape it expects", () => {
    expect(withTypeFields(null)).toEqual([]);
    expect(withTypeFields({})).toEqual([]);
    expect(withTypeFields({ giftUrls: "not-a-list" })).toEqual([]);
    expect(withTypeFields({ giftUrls: [42, null, "not a url"] })).toEqual([]);
  });
});
