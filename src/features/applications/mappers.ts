import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

// Browse-card projection: the ONLY child fields a volunteer may see before
// claiming (guardrail). Sensitive fields are dropped here at the data layer, so
// a redacted card physically cannot carry delivery/contact info to the client.
//
// `familyStory` is on the card by a DELIBERATE decision (Vital, Phase 6): a
// volunteer chooses which child to help, and the family's own account of what
// happened to them is the thing that informs that choice — withholding it until
// after the commitment inverts the order. It is consistent with what we already
// promise parents on the form: «це читає чарівник, який обиратиме дитину».
// Note this widens tier 1, so it is the one free-text field any signed-in user
// can read; the delivery address, parent name and contact remain post-claim
// only.
//
// `home_region` + `home_town` are also on the card (Vital, Phase 6). Origin is
// where the family no longer is, so it locates nobody.
//
// The 118:420 redesign (Vital, 2026-10-23) moved the tier in BOTH directions,
// and the §4.3 list he supplied with it is the authority for each half:
//   OUT — `current_town`, `current_region` and `gift_price`. The card now shows
//         one place, «звідки виїхали», and no price; §4.3 no longer promises
//         any of the three. This reverses the Phase 6 widening I argued against
//         twice, so the risk it carried is gone.
//   IN  — the LETTER PHOTO and the SHOP LINKS, which §4.3 previously listed as
//         things a volunteer does NOT see. That is the real widening here, and
//         it is the one the policy had to move for.
// The child-with-letter photo did NOT move: a letter is handwriting and a wish,
// a photograph of the child is their face.
//
// This is a DTO mapper, not authorization — it lives beside the resource rather
// than in authz.ts (CLAUDE.md).
export type BrowseCard = {
  id: Application["id"];
  childFirstName: string | null;
  childAge: Application["childAge"];
  // On the card because it draws the child's icon (Vital). It discloses no
  // more than the first name beside it already does — Ukrainian given names
  // are gendered almost without exception — which is the reason this one could
  // join tier 1 without the argument `current_town` needed.
  //
  // It is the one tier-1 field the public statements do NOT enumerate: policy
  // §2.2 / §4.3 and the «Чи побачать волонтери адресу моєї дитини?» FAQ answer
  // were deliberately left as they are (Vital, 2026-10-23), so those lists are
  // now shorter than this projection. I argued the other way — §4.3 is a list,
  // and a parent reading a short one does not learn what the long one would
  // have told them — and was overruled; recorded here so it reads as a
  // decision, not a slip. policyTiers.test.ts carries the exemption by name,
  // so every OTHER field still has to appear in §4.3 before it can ship.
  childGender: Application["childGender"];
  // Where the family came FROM — both parts. A child's origin is not where
  // they can be found, so it carries far less risk than the destination.
  homeRegion: Application["homeRegion"];
  homeTown: Application["homeTown"];
  giftDescription: Application["giftDescription"];
  // The shop links the parent chose, from type_fields. Tier 1 as of the 118:420
  // card, which lists them under «Посилання на подарунок» — so a volunteer can
  // see what the child actually asked for before committing. Note this also
  // means someone can buy without claiming: the claim is what creates the
  // contact and the audit entry, so a gift bought off a card nobody claimed
  // arrives with no trail. Flagged, not solved.
  giftUrls: readonly string[];
  // The id of the letter photo, if the parent uploaded one — NOT the file, and
  // not a signed url. Reads go through the authorized route, which checks the
  // kind and logs every single one; a url that could be forwarded would defeat
  // both. Null when the application has no letter photo, which is every
  // application submitted before the upload existed.
  letterPhotoId: string | null;
  familyStory: Application["familyStory"];
  status: Application["status"];
};

export function toBrowseCard(
  application: Application,
  // The letter photo lives in another table, so it cannot be derived from the
  // application row — it is passed in, and defaults to absent. A caller that
  // forgets it shows no photo; it can never show someone else's.
  letterPhotoId: string | null = null,
): BrowseCard {
  return {
    id: application.id,
    childFirstName: firstName(application.childName),
    childAge: application.childAge,
    childGender: application.childGender,
    homeRegion: application.homeRegion,
    homeTown: application.homeTown,
    giftDescription: application.giftDescription,
    giftUrls: giftUrls(application.typeFields),
    letterPhotoId,
    familyStory: application.familyStory,
    status: application.status,
  };
}

// type_fields is jsonb, so it is `unknown` as far as the type system is
// concerned: anything in there has to be checked, not cast. A malformed value
// yields no links rather than throwing on a page that lists children.
function giftUrls(typeFields: Application["typeFields"]): readonly string[] {
  if (!typeFields || typeof typeFields !== "object") {
    return [];
  }
  const value = (typeFields as { giftUrls?: unknown }).giftUrls;
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is string => typeof entry === "string" && isHttpUrl(entry),
  );
}

// These URLs are PARENT-SUPPLIED and now go into an href on a page every
// volunteer sees. zod's `.url()` accepts anything the URL constructor does,
// which includes `javascript:` — so the protocol is checked here, where the
// value leaves the database, rather than trusted because it was validated once
// on the way in. An older row could predate any validation at all.
function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
