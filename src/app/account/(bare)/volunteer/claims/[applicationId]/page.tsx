import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { ClaimDetail } from "@/components/volunteer/ClaimDetail";
import { recordAuditLog } from "@/features/audit/log";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import {
  CLAIM_VISIBLE_KINDS,
  latestByKind,
} from "@/features/applications/files";
import { getMyClaim } from "@/features/claims/queries";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("volunteer.claims.meta");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

// «Картка дитини — повна» (Figma 130:2506) — one child this volunteer holds.
//
// THE tier-2 surface: the family's current town, the delivery details, the
// parent's name and their contact are on this page and nowhere else a volunteer
// can reach. Which is why the read is audit-logged HERE, per child, rather than
// once for a list of them.
//
// Authorization is the query, not a check after it: getMyClaim is scoped to
// this volunteer's own ACTIVE claim, so an application they do not hold comes
// back as null and there is no object for a later check to forget about.
export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(actor, `/account/volunteer/claims/${applicationId}`),
    );
  }

  const claim = await getMyClaim(actor.id, applicationId);
  // 404, not 403: someone probing ids must not learn which of them exist.
  if (!claim) {
    notFound();
  }

  const files = await listApplicationFiles(applicationId);
  const photos = latestByKind(files, CLAIM_VISIBLE_KINDS);

  await recordAuditLog({
    actor,
    action: "claim.details_viewed",
    targetType: "application",
    targetId: applicationId,
  });

  return (
    <ClaimDetail
      application={claim.application}
      photos={photos}
      contact={resolveUserContact({
        username: claim.parentUsername,
        phone: claim.parentPhone,
      })}
    />
  );
}
