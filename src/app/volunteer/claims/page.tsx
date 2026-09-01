import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { ClaimCard } from "@/components/volunteer/ClaimCard";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import {
  CLAIM_VISIBLE_KINDS,
  latestByKind,
} from "@/features/applications/files";
import { listMyClaims } from "@/features/claims/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// The children this volunteer holds — and the ONLY place they see tier-2 data:
// current town, delivery information, the parent's name and the family's
// contact. Every render is audit-logged, because this is a reveal of a child's
// sensitive details, not a neutral list.
export default async function MyClaimsPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/volunteer/claims"));
  }

  const t = await getTranslations("volunteer.claims");
  const tBack = await getTranslations("volunteer");
  const campaign = await getActiveCampaignForIntake();
  const rows = campaign ? await listMyClaims(actor.id, campaign.id) : [];

  // The photos this volunteer is entitled to: the child's letter, the child
  // holding it, and the family's confirmation once the gift arrives.
  //
  // canViewApplicationFile has allowed all three to the claiming volunteer
  // since Phase 4 — the letter photos simply had no page to appear on, so the
  // volunteer chose a wish they could never read. The ВПО certificate is not in
  // CLAIM_VISIBLE_KINDS and never will be.
  const photos = new Map(
    await Promise.all(
      rows.map(async ({ application }) => {
        const files = await listApplicationFiles(application.id);
        return [
          application.id,
          latestByKind(files, CLAIM_VISIBLE_KINDS),
        ] as const;
      }),
    ),
  );

  if (rows.length > 0) {
    await recordAuditLog({
      actor,
      action: "claim.details_viewed",
      targetType: "user",
      targetId: actor.id,
    });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/volunteer/children"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {tBack("backToChildren")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-4">{t("empty")}</p>
        ) : (
          <>
            <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
            <ul className="mt-6 flex flex-col gap-4">
              {rows.map(({ application, claimedAt, ...parent }) => (
                <ClaimCard
                  key={application.id}
                  application={application}
                  claimedAt={claimedAt}
                  parentUsername={parent.parentUsername}
                  parentPhone={parent.parentPhone}
                  photos={photos.get(application.id) ?? []}
                  // Collapsed once there is more than one, so the list is
                  // scannable; open when it is the only one, because clicking
                  // to reveal the single thing on the page is pure friction.
                  defaultOpen={rows.length === 1}
                />
              ))}
            </ul>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
