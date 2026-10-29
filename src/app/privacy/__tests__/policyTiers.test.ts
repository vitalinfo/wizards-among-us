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
const card = toBrowseCard(
  {
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
    typeFields: { giftUrls: ["https://rozetka.com.ua/p1/"] },
    familyStory: "Виїхали у 2022 році.",
    status: "approved",
  } as unknown as typeof applications.$inferSelect,
  "file-1",
);

const access = messages.policy.sections.access.body;
// §4.3 only. The slice has to STOP at §4.4, or the «не бачать» half runs on
// into the post-claim list — which legitimately names the shop link and the
// letter photo as things the chosen charivnyk receives, and would make the
// disjointness check below fail on fields that are correctly in both sections.
const beforePostClaim = access.slice(0, access.indexOf("<h3>4.4."));
const [, preClaim = "", postClaimStage = ""] = beforePostClaim.split(
  /<p>У такому переліку їм можуть бути доступні:<\/p>|<p>На цьому етапі користувачі не бачать:<\/p>/,
);

// Fields the card carries that §4.3 deliberately does NOT enumerate.
//
// `childGender` is here by Vital's call (2026-10-23): the gender goes on the
// card, for the child icon, and the document stays as it is. I argued the other
// way — §4.3 is a LIST, so one shorter than the card means a parent reading it
// does not learn the gender is visible — and was overruled. Recorded as a
// decision so it does not read as an oversight, and kept out of DESCRIBED so
// the guard below still fails for the NEXT field somebody adds.
const UNDOCUMENTED = new Set(["childGender", "giftDescription"]);

// Which sentence in §4.3 accounts for each field the card carries. `id` and
// `status` are not personal data — one is a row id, the other is whether the
// child is still waiting — so the document does not describe them.
const DESCRIBED: Record<string, string | null> = {
  id: null,
  status: null,
  childName: "ім’я та прізвище дитини",
  childAge: "вік дитини",
  homeRegion: "родина була змушена залишити через війну",
  homeTown: "родина була змушена залишити через війну",
  // Both moved INTO the pre-claim list with the 118:420 card (Vital): §4.3 used
  // to name them as things a charivnyk does not see, and the §4.3 he supplied
  // with the design names them as things they do.
  giftUrls: "посилання на бажаний подарунок",
  letterPhotoId: "фотографія листа дитини Чарівному Миколаю",
  familyStory: "історія родини",
};

describe("the policy's pre-claim list and the browse card", () => {
  it("describes every field the browse card carries", () => {
    const undescribed = Object.keys(card).filter(
      (key) =>
        !UNDOCUMENTED.has(key) &&
        (!(key in DESCRIBED) || DESCRIBED[key] === undefined),
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
    ]) {
      expect(card, `${field} must not reach a browse card`).not.toHaveProperty(
        field,
      );
    }
  });

  it("lists the documents and the child's photo as unseen", () => {
    for (const phrase of [
      "документів, наданих для перевірки анкети",
      "номера телефону батьків",
      "прізвища батьків або законного представника",
      "даних для доставки подарунка",
      // The photo of the CHILD stayed behind when the photo of the LETTER moved
      // to the card. That split is the point: a letter is handwriting and a
      // wish, a child's photograph is their face.
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
    // Nothing the card now shows may ALSO appear in the «не бачать» list: the
    // two are read together, and a field in both is worse than a field in
    // neither. This is the check that would have caught shipping the 118:420
    // card without moving the document.
    for (const phrase of Object.values(DESCRIBED)) {
      if (phrase === null) {
        continue;
      }
      expect(postClaimStage, `§4.3 still denies: ${phrase}`).not.toContain(
        phrase,
      );
    }
  });
});
