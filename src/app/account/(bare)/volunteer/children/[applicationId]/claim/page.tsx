import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { claimAction } from "@/app/volunteer/actions";
import { ClaimBriefing } from "@/components/volunteer/claimBriefing";
import { getApplicationForFileAccess } from "@/features/applications/queries";
import { getCampaignById } from "@/features/campaigns/queries";
import { getActiveClaim } from "@/features/claims/queries";
import { getUserContact } from "@/features/users/queries";
import { isContactable } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { safeReturnPath } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { canBrowseChildren, getClaimBlockReason } from "@/lib/authz";
import { signedOutRedirect } from "@/lib/auth/returnPath";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("volunteer.claim.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

// «Перед тим як стати Чарівником» (Figma 118:420 «Погодження») — what a
// volunteer reads before taking a child.
//
// A PAGE rather than the modal this replaced: it is a budget, a deadline, a
// physical letter to post and a delivery to agree with a stranger. A dialog
// that size is a dialog nobody reads.
//
// The gate still lives in claimAction, not here. This screen refuses early so a
// volunteer is not asked to read a page and then told no — but a claim that
// arrives anyway is re-checked, and the unique index is what actually makes
// double-claiming impossible (CLAUDE.md).
export default async function ClaimBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { applicationId } = await params;
  const { return: returnParam } = await searchParams;
  const backHref =
    safeReturnPath(returnParam ?? "") || "/account/volunteer/children";

  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(
        actor,
        `/account/volunteer/children/${applicationId}/claim`,
      ),
    );
  }
  // Not joined yet: to the cabinet's front page, which offers the opt-in.
  if (!canBrowseChildren(actor)) {
    redirect("/account/volunteer");
  }

  const context = await getApplicationForFileAccess(applicationId);
  // `browsable` is the same test the card list uses — approved or claimed, in
  // the active campaign — so a link to a draft, a rejected application or last
  // year's child leads nowhere rather than to a briefing about it.
  if (!context || !context.browsable) {
    redirect(backHref);
  }

  const claim = await getActiveClaim(applicationId);
  const contact = await getUserContact(actor.id);
  const blocked = getClaimBlockReason(actor, context.application, claim, {
    contactable: isContactable(contact),
  });
  // A volunteer with no reachable contact is sent to add one, exactly as the
  // action does — the family has to be able to reach them.
  if (blocked === "no_contact") {
    redirect(
      `/account/volunteer/contact?next=${encodeURIComponent(
        `/account/volunteer/children/${applicationId}/claim`,
      )}`,
    );
  }

  const campaign = await getCampaignById(context.application.campaignId);
  const format = await getFormatter();

  return (
    <ClaimBriefing
      backHref={backHref}
      // WHICH briefing, not just what is in it. The «Святий Миколай» copy talks
      // about a letter to Миколай and a gift under the pillow, so a campaign of
      // another type must not be shown it — the same reason the parent form
      // picks its steps by type rather than defaulting to one.
      campaignType={campaign?.type ?? null}
      // The budget and the deadline are the CAMPAIGN's, not a date typed into
      // the copy: the design says «до 699 грн» and «5 грудня», and both move
      // with the campaign row. A campaign without an end date simply does not
      // render the deadline block.
      giftPriceCap={campaign?.giftPriceCap ?? null}
      deadline={
        campaign?.endsAt
          ? format.dateTime(campaign.endsAt, { day: "numeric", month: "long" })
          : null
      }
      action={
        blocked === null
          ? claimAction.bind(null, applicationId, backHref)
          : null
      }
    />
  );
}
