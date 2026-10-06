import type { ResolvedSettings } from "@/features/campaigns/authz";
import { intakeOpen } from "@/features/campaigns/authz";
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
    // The slug is the CAMPAIGN TYPE, hyphenated (Vital) — the same word the
    // database uses for this initiative, so a URL and a `campaigns.type` row
    // cannot drift into describing different things. `key` stays short
    // because it only indexes message copy.
    slug: "saint-nicholas-day",
    image: "/initiative-mykolai.webp",
    campaignType: "saint_nicholas_day",
  },
  { key: "family", slug: "family", image: "/initiative-family.webp" },
  {
    key: "school",
    slug: "new-school-year",
    image: "/initiative-school.webp",
    campaignType: "new_school_year",
  },
];

// Which of the design's three pills an initiative shows.
//
// It follows WHETHER A PARENT CAN ACTUALLY APPLY, not just whether a campaign
// row says `active` — because the pill sits over a button labelled «Прийняти
// участь», and the real gate is three conditions, not one: an active campaign,
// that campaign still accepting submissions, and the global kill switch on
// (`intakeOpen`, §6). Reading only the first meant a paused campaign — or a
// thrown kill switch — still advertised «Відбувається набір» above a live link
// into a form that then turned the family away.
//
// Deriving both the pill and the button from this one answer is the point:
// they cannot disagree.
//
//   open    intake is genuinely open            → «Відбувається набір»
//   closed  that campaign is archived           → «Набір завершено»
//   soon    everything else                     → «Набір ще не відкрито»
//
// «everything else» is doing real work: no campaign of that type, one still in
// `draft`, or a live one whose submissions are shut. All three mean the same
// thing to a parent — you cannot apply right now — and «Набір ще не відкрито»
// is the least wrong of the three labels the design gives us. If the designer
// wants to tell «paused» apart from «not yet», that is a fourth pill.
export function initiativeStatus(
  campaigns: CampaignStates,
  settings: ResolvedSettings,
  campaignType?: keyof CampaignStates,
): InitiativeStatus {
  if (!campaignType) {
    return "soon";
  }
  const campaign = campaigns[campaignType];
  if (campaign === undefined) {
    return "soon";
  }
  if (intakeOpen({ campaign, settings })) {
    return "open";
  }
  return campaign.status === "archived" ? "closed" : "soon";
}
