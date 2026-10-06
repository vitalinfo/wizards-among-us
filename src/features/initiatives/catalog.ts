import type { CampaignStates } from "@/features/campaigns/queries";

export type InitiativeStatus = "open" | "soon" | "closed";

// The three initiatives, in the design's order. Shared, because two surfaces
// now render the same list — the landing section and the /initiatives page —
// and a second copy of it is a thing that drifts silently: add a fourth
// initiative to one and the other quietly keeps three.
//
// `key` indexes into `landing.initiatives.items` for the copy. `slug` is the
// URL segment for the initiative's own page. `campaignType` ties the card to
// the database: whether it reads as open, finished or not yet running comes
// from whether we have ever run a campaign of that type and whether one is
// running now.
//
// «Чарівник для родини» has no campaign type — it is the on-demand one and we
// do not run it as a campaign — so it always resolves to «Набір ще не
// відкрито», which is the state the design draws it in.
export type Initiative = {
  key: string;
  slug: string;
  image: string;
  campaignType?: keyof CampaignStates;
};

export const INITIATIVES: readonly Initiative[] = [
  {
    key: "mykolai",
    slug: "mykolai",
    image: "/initiative-mykolai.webp",
    campaignType: "saint_nicholas_day",
  },
  { key: "family", slug: "family", image: "/initiative-family.webp" },
  {
    key: "school",
    slug: "school",
    image: "/initiative-school.webp",
    campaignType: "new_school_year",
  },
];

export function initiativeStatus(
  campaigns: CampaignStates,
  campaignType?: keyof CampaignStates,
): InitiativeStatus {
  if (!campaignType) {
    return "soon";
  }
  const state = campaigns[campaignType];
  if (state === undefined) {
    return "soon";
  }
  return state === "active" ? "open" : "closed";
}
