import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ConfirmReceiptForm } from "@/components/parent/ConfirmReceiptForm";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { getMyApplication } from "@/features/applications/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ConfirmReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ blocked?: string }>;
}) {
  const [{ applicationId }, query] = await Promise.all([params, searchParams]);
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(actor, `/parent/applications/${applicationId}/confirm`),
    );
  }

  // Scoped to this parent: a wrong id 404s rather than revealing that someone
  // else's application exists.
  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    notFound();
  }

  const t = await getTranslations("parent.confirm");
  const files = await listApplicationFiles(applicationId);
  const photo = files.find((file) => file.kind === "confirmation") ?? null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/parent/applications"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("backCta")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>

        {application.status === "fulfilled" ? (
          <div className="border-border bg-surface-muted mt-6 rounded-lg border p-4">
            <p className="font-semibold">{t("alreadyDone.title")}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("alreadyDone.body")}
            </p>
            <Link
              href={`/parent/review?application=${applicationId}`}
              className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              {t("alreadyDone.reviewCta")}
            </Link>
          </div>
        ) : application.status !== "claimed" ? (
          // Nothing to confirm until a volunteer actually holds the child.
          <p className="text-muted-foreground mt-6">{t("notClaimed")}</p>
        ) : (
          <>
            <p className="text-body mt-2 text-sm leading-relaxed">
              {t("body")}
            </p>
            <div className="mt-6">
              <ConfirmReceiptForm
                applicationId={applicationId}
                photo={
                  photo
                    ? {
                        id: photo.id,
                        kind: photo.kind,
                        contentType: photo.contentType,
                      }
                    : null
                }
                blocked={query.blocked ?? null}
              />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
