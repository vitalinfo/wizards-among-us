import type { ReactNode } from "react";

import type { CampaignType } from "@/db/enums";

import { SaintNicholasBriefing } from "./SaintNicholasBriefing";

export type BriefingBodyProps = {
  giftPriceCap: string | null;
  // Already formatted («5 грудня»), or null when the campaign has no end date.
  deadline: string | null;
};

// A briefing body is an async server component, called and awaited by
// ClaimBriefing rather than rendered as <Body /> — see the note there.
export type BriefingBody = (props: BriefingBodyProps) => Promise<ReactNode>;

// Which briefing a campaign shows its volunteers. Deliberately a lookup rather
// than one hardcoded body, and the exact shape `stepsForCampaignType` uses for
// the parent form — for the same reason, from the other side of the same
// campaign.
//
// A type with no briefing here renders NOTHING and says so. That matters:
// without it, activating a New School Year campaign would silently show
// volunteers the «Святий Миколай» briefing — a letter to St Nicholas, a gift
// under the pillow and the morning of the 6th — in a back-to-school campaign,
// and nothing anywhere would object. The parent form already refuses this way;
// the claim path did not, which is the gap this closes.
const BRIEFINGS: Partial<Record<CampaignType, BriefingBody>> = {
  saint_nicholas_day: SaintNicholasBriefing,
};

export function briefingForCampaignType(
  type: CampaignType | null | undefined,
): BriefingBody | null {
  if (!type) {
    return null;
  }
  return BRIEFINGS[type] ?? null;
}
