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
// can read; the CURRENT town, address, parent name and contact remain
// post-claim only.
//
// `home_region` + `home_town` are also on the card (Vital, Phase 6) so a
// volunteer sees the journey — «Донецька область (м. Донецьк) → Львівська
// область». Origin is where the family no longer is, so it locates nobody.
//
// This is a DTO mapper, not authorization — it lives beside the resource rather
// than in authz.ts (CLAUDE.md).
export type BrowseCard = {
  id: Application["id"];
  childFirstName: string | null;
  childAge: Application["childAge"];
  // Where the family came FROM — both parts. A child's origin is not where
  // they can be found, so it carries far less risk than the destination.
  homeRegion: Application["homeRegion"];
  homeTown: Application["homeTown"];
  // Destination at OBLAST level only. `current_town` stays tier 2: it is the
  // "where does this child physically live now" field, and combined with a
  // first name, an age and a family story it is enough to find one displaced
  // family in a small town. It is revealed to the claiming volunteer, as before.
  currentRegion: Application["currentRegion"];
  giftDescription: Application["giftDescription"];
  giftPrice: Application["giftPrice"];
  familyStory: Application["familyStory"];
  status: Application["status"];
};

export function toBrowseCard(application: Application): BrowseCard {
  return {
    id: application.id,
    childFirstName: firstName(application.childName),
    childAge: application.childAge,
    homeRegion: application.homeRegion,
    homeTown: application.homeTown,
    currentRegion: application.currentRegion,
    giftDescription: application.giftDescription,
    giftPrice: application.giftPrice,
    familyStory: application.familyStory,
    status: application.status,
  };
}

function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
