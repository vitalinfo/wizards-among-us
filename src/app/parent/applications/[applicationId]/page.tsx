import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationForm } from "@/components/parent/applicationForm/ApplicationForm";
import { ApplicationStatusBadge } from "@/components/parent/ApplicationStatusBadge";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { canEditApplication } from "@/features/applications/authz";
import {
  getMyApplication,
  getUserContactFields,
} from "@/features/applications/queries";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const [{ applicationId }, query] = await Promise.all([params, searchParams]);
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  // Scoped to this parent. A wrong id 404s rather than revealing that someone
  // else's application exists.
  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    notFound();
  }

  const t = await getTranslations("parent.form");
  const tBlocked = await getTranslations("parent.applications.blocked");
  const editable = canEditApplication(actor, application);

  // Resolved live rather than copied onto the application: the delivery step
  // only asks for a phone when there's no Telegram handle to use.
  const [campaign, contactFields, uploaded] = await Promise.all([
    getActiveCampaignForIntake(),
    getUserContactFields(actor.id),
    listApplicationFiles(applicationId),
  ]);
  const contact = resolveUserContact(contactFields);

  // Keyed by kind: each upload slot is single-file, so the newest wins if a
  // parent somehow has two of a kind.
  const files = Object.fromEntries(
    uploaded.map((file) => [
      file.kind,
      { id: file.id, kind: file.kind, contentType: file.contentType },
    ]),
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          {/* A stable page title — each step carries its own heading, so this
              must not name one particular step. */}
          <h1 className="text-3xl font-semibold">{t("pageTitle")}</h1>
          <ApplicationStatusBadge status={application.status} />
        </div>

        {query.submitted ? (
          <div
            role="status"
            className="border-primary/30 bg-primary/10 mt-6 rounded-lg border p-4"
          >
            <h2 className="font-semibold">{t("submitted.title")}</h2>
            <p className="text-body mt-1 text-sm">{t("submitted.body")}</p>
            <Link
              href="/parent/applications"
              className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              {t("submitted.backCta")}
            </Link>
          </div>
        ) : null}

        <div className="mt-8">
          {editable ? (
            <ApplicationForm
              application={application}
              contact={contact}
              giftPriceCap={campaign?.giftPriceCap ?? null}
              files={files}
            />
          ) : (
            <p className="text-muted-foreground">{tBlocked("locked")}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
