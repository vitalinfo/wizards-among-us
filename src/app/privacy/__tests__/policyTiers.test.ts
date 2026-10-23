import { describe, expect, it } from "vitest";

import messages from "../../../../messages/uk.json";
import type { applications } from "@/db/schema";
import { toBrowseCard } from "@/features/applications/mappers";

// §4.3 of the policy tells a parent what a volunteer can see about their child
// BEFORE choosing them. `toBrowseCard` is the code that decides it. This spec
// is the only thing holding the two together.
//
// It matters more than it looks. The policy is the public statement of tier 1
// (CLAUDE.md), and the two have already come apart once: the document as
// written had the letter photo and the shop link on the pre-claim card, and
// left the family's CURRENT town off it — so a parent would have read that the
// town they live in now reaches only the volunteer who chose their child, when
// in fact any signed-in user browsing sees it. Vital's call was that the code
// is right; §4.3 and §4.4 were corrected to match it.
//
// Keys are read off the mapper's RETURN VALUE, not off the BrowseCard type: a
// type cannot be enumerated at runtime, and a field added to the projection is
// exactly the change that needs to fail here.
const card = toBrowseCard({
  id: "a1",
  childName: "Марійка Коваль",
  childAge: 8,
  childGender: "girl",
  homeRegion: "donetska",
  homeTown: "Донецьк",
  currentRegion: "lvivska",
  currentTown: "Стрий",
  giftDescription: "Лялька",
  giftPrice: "700.00",
  familyStory: "Виїхали у 2022 році.",
  status: "approved",
} as unknown as typeof applications.$inferSelect);

const access = messages.policy.sections.access.body;
const [, preClaim = "", postClaimStage = ""] = access.split(
  /<p>До вибору дитини чарівники можуть бачити в анкеті:<\/p>|<p>На цьому етапі чарівники не бачать:<\/p>/,
);

// Which sentence in §4.3 accounts for each field the card carries. `id` and
// `status` are not personal data — one is a row id, the other is whether the
// child is still waiting — so the document does not describe them.
const DESCRIBED: Record<string, string | null> = {
  id: null,
  status: null,
  childFirstName: "ім’я дитини без прізвища",
  childAge: "вік дитини",
  childGender: "стать дитини",
  homeRegion: "родина була змушена залишити через війну",
  homeTown: "родина була змушена залишити через війну",
  currentRegion: "у якому родина проживає зараз",
  currentTown: "у якому родина проживає зараз",
  giftDescription: "опис бажаного подарунка",
  giftPrice: "орієнтовну вартість",
  familyStory: "історію родини",
};

describe("the policy's pre-claim list and the browse card", () => {
  it("describes every field the browse card carries", () => {
    const undescribed = Object.keys(card).filter(
      (key) => !(key in DESCRIBED) || DESCRIBED[key] === undefined,
    );
    expect(undescribed, "fields the policy does not account for").toEqual([]);

    for (const [key, phrase] of Object.entries(DESCRIBED)) {
      if (phrase === null) {
        continue;
      }
      expect(preClaim, `§4.3 should mention ${key}`).toContain(phrase);
    }
  });

  it("carries nothing the policy promises is post-claim only", () => {
    // Named in §4.3's «не бачать» list, and absent from the projection.
    for (const field of [
      "letterPhoto",
      "childWithLetterPhoto",
      "deliveryInformation",
      "parentName",
      "typeFields",
      "idpCertificate",
      "childName",
    ]) {
      expect(card, `${field} must not reach a browse card`).not.toHaveProperty(
        field,
      );
    }
  });

  it("lists the letter photo, the shop link and the surnames as unseen", () => {
    for (const phrase of [
      "прізвища дитини",
      "документів, наданих для перевірки анкети",
      "номера телефону батьків",
      "прізвища батьків або законного представника",
      "даних для доставки подарунка",
      "посилання на бажаний подарунок",
      "фотографії листа дитини Чарівному Миколаю",
      "фотографії дитини з листом",
    ]) {
      expect(
        postClaimStage,
        `§4.3 «не бачать» should list: ${phrase}`,
      ).toContain(phrase);
    }
  });

  // The pre-claim paragraph must not re-promise anything the next paragraph
  // takes away — the two lists are read together and a field in both is worse
  // than a field in neither.
  it("keeps the two lists disjoint", () => {
    for (const phrase of [
      "фотографію листа дитини Чарівному Миколаю",
      "посилання на бажаний подарунок",
    ]) {
      expect(preClaim, `§4.3 still offers: ${phrase}`).not.toContain(phrase);
    }
  });
});
