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
import { getSessionActor } from "@/lib/auth/session";

import { startApplication } from "./actions";

// Session- and campaign-dependent; inherits the root layout's noindex default.
export const dynamic = "force-dynamic";

export default async function MyApplicationsPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  const t = await getTranslations("parent.applications");
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
