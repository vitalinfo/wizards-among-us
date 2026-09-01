import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { MyApplicationsList } from "@/components/parent/MyApplicationsList";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/Button";
import { canStartApplication } from "@/features/applications/authz";
import { listMyApplications } from "@/features/applications/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

import { startApplication } from "./actions";

// Session- and campaign-dependent; inherits the root layout's noindex default.
export const dynamic = "force-dynamic";

export default async function MyApplicationsPage({
  searchParams,
}: {
  // Set by the submit action, which lands here rather than back in the form.
  searchParams: Promise<{ submitted?: string; saved?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    // Carry the destination so signing in returns here, not to the home page.
    redirect(signedOutRedirect(actor, "/parent/applications"));
  }

  const query = await searchParams;
  const t = await getTranslations("parent.applications");
  const tForm = await getTranslations("parent.form");
  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);

  // The archive is DERIVED: we only ever list the active campaign's
  // applications, so prior-year ones disappear without a separate store.
  const applications = campaign
    ? await listMyApplications(actor.id, campaign.id)
    : [];
  const canStart = canStartApplication(actor, { campaign, settings });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>

        {/* A first submission starts the two-day clock; saving an edit does
            not restart it, so the two say different things. */}
        {query.submitted || query.saved ? (
          <div
            role="status"
            className="border-primary/30 bg-primary/10 mt-6 rounded-lg border p-4"
          >
            <h2 className="font-semibold">
              {query.saved ? tForm("saved.title") : tForm("submitted.title")}
            </h2>
            <p className="text-body mt-1 text-sm">
              {query.saved ? tForm("saved.body") : tForm("submitted.body")}
            </p>
          </div>
        ) : null}

        {canStart ? (
          <form action={startApplication} className="mt-6">
            <Button type="submit">{t("newCta")}</Button>
          </form>
        ) : (
          <div className="border-border bg-surface-muted mt-6 rounded-lg border p-4">
            <h2 className="font-semibold">{t("closed.title")}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("closed.body")}
            </p>
          </div>
        )}

        <div className="mt-8">
          <MyApplicationsList applications={applications} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
