import type { applications } from "@/db/schema";

type Application = typeof applications.$inferSelect;

// Browse-card projection: the ONLY child fields a volunteer may see before
// claiming (guardrail). Sensitive fields are dropped here at the data layer, so
// a redacted card physically cannot carry delivery/contact info to the client.
//
// This is a DTO mapper, not authorization — it lives beside the resource rather
// than in authz.ts (CLAUDE.md).
export type BrowseCard = {
  id: Application["id"];
  childFirstName: string | null;
  childAge: Application["childAge"];
  currentRegion: Application["currentRegion"];
  giftDescription: Application["giftDescription"];
  giftPrice: Application["giftPrice"];
  status: Application["status"];
};

export function toBrowseCard(application: Application): BrowseCard {
  return {
    id: application.id,
    childFirstName: firstName(application.childName),
    childAge: application.childAge,
    currentRegion: application.currentRegion,
    giftDescription: application.giftDescription,
    giftPrice: application.giftPrice,
    status: application.status,
  };
}

function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
