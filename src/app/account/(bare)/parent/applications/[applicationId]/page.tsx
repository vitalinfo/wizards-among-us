import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { BarePageHeader } from "@/components/account/BarePageHeader";
import { ApplicationForm } from "@/components/parent/applicationForm/ApplicationForm";
import { stepsForCampaignType } from "@/components/parent/applicationForm/steps";
import { SITE_CONTAINER } from "@/components/site/layout";
import { canEditApplication } from "@/features/applications/authz";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import {
  getMyApplication,
  getUserContactFields,
  getUserFullName,
} from "@/features/applications/queries";
import { getCampaignById } from "@/features/campaigns/queries";
import { turnstileSiteKey } from "@/features/turnstile/verify";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.form");
  return { title: t("stepsLabel") };
}

export const dynamic = "force-dynamic";

// «Анкета дитини» (Figma 147:7166) — the form, as a full page: the logo, ×
// back to the list, and the five steps. No cabinet sidebar beside it: it is
// the longest thing a family fills in, and the design gives it the width.
//
// Only an application the parent may still EDIT is shown here. Anything
// locked — approved and after, or from a campaign that has ended — has
// nothing to fill in, so it goes to the read-only card the eye opens.
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(actor, `/account/parent/applications/${applicationId}`),
    );
  }

  // Scoped to this parent. A wrong id 404s rather than revealing that someone
  // else's application exists.
  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    notFound();
  }

  const t = await getTranslations("parent.form");

  // Resolved live rather than copied onto the application: the delivery step
  // only asks for a phone when there's no Telegram handle to use.
  const [campaign, contactFields, uploaded, parentName] = await Promise.all([
    // THIS application's campaign, not whichever is active — an application
    // from a past campaign must render against the form it was written for.
    getCampaignById(application.campaignId),
    getUserContactFields(actor.id),
    listApplicationFiles(applicationId),
    getUserFullName(actor.id),
  ]);

  // An application from a finished campaign is read-only, whatever its
  // status; the submit action already refuses it.
  if (
    !canEditApplication(actor, application) ||
    campaign?.status !== "active"
  ) {
    redirect(`/account/parent/applications/${applicationId}/view`);
  }

  const contact = resolveUserContact(contactFields);
  const steps = stepsForCampaignType(campaign?.type);

  // Keyed by kind: each upload slot is single-file, so the newest wins if a
  // parent somehow has two of a kind. That only holds because
  // listApplicationFiles is ordered oldest-first — later keys overwrite
  // earlier ones.
  const files = Object.fromEntries(
    uploaded.map((file) => [
      file.kind,
      { id: file.id, kind: file.kind, contentType: file.contentType },
    ]),
  );

  return (
    <>
      <BarePageHeader
        closeHref="/account/parent/applications"
        closeLabel={t("close")}
      />
      <div className={cn(SITE_CONTAINER, "pb-16 lg:pb-24")}>
        {!steps ? (
          // No form is defined for this campaign type. Refuse loudly rather
          // than falling back to another campaign's questions.
          <div className="border-border bg-surface-muted mx-auto max-w-[537px] rounded-lg border p-4">
            <h1 className="font-semibold">{t("unsupportedCampaign.title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("unsupportedCampaign.body")}
            </p>
          </div>
        ) : (
          <ApplicationForm
            application={application}
            contact={contact}
            defaultParentName={parentName}
            giftPriceCap={campaign?.giftPriceCap ?? null}
            files={files}
            turnstileSiteKey={turnstileSiteKey()}
            steps={steps}
          />
        )}
      </div>
    </>
  );
}
