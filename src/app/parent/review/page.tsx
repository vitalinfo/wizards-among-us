import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReviewForm } from "@/components/parent/ReviewForm";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getMyApplication } from "@/features/applications/queries";
import { getReviewBlockReason } from "@/features/reviews/authz";
import { hasReviewed } from "@/features/reviews/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function LeaveReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/parent/review"));
  }

  const { application: applicationId } = await searchParams;
  const t = await getTranslations("parent.review");
  const tBack = await getTranslations("parent");

  const application = applicationId
    ? await getMyApplication(applicationId, actor.id)
    : null;

  // Reviews are per-application (Vital, Phase 7: only once a wish is
  // fulfilled), so without one there is nothing to review.
  const blocked = application
    ? getReviewBlockReason(actor, application, {
        alreadyReviewed: await hasReviewed(actor.id, application.id),
      })
    : "not_owner";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>

        {blocked ? (
          <>
            <p className="text-muted-foreground mt-4">
              {t(`errors.${blocked}`)}
            </p>
            <Link
              href="/parent/applications"
              className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              {tBack("backToApplications")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-body mt-2 text-sm leading-relaxed">
              {t("intro", { child: application?.childName ?? "" })}
            </p>
            <div className="mt-6">
              <ReviewForm applicationId={application!.id} />
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
