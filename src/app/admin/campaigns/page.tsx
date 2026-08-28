import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { CampaignCreateForm } from "@/components/admin/CampaignCreateForm";
import { CampaignRow } from "@/components/admin/CampaignRow";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { getResolvedSettings } from "@/features/settings/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { setKillSwitchAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const t = await getTranslations("admin.campaigns");
  const [campaigns, settings] = await Promise.all([
    listCampaigns(),
    getResolvedSettings(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
      </div>

      {/* The emergency override, kept visually separate from campaign state so
          it's never mistaken for a per-campaign setting. */}
      <section className="border-border bg-surface-muted rounded-lg border p-4">
        <h2 className="font-semibold">{t("killSwitch.title")}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("killSwitch.body")}
        </p>
        <p className="mt-2 text-sm font-medium">
          {settings.applicationsEnabled
            ? t("killSwitch.enabled")
            : t("killSwitch.disabled")}
        </p>
        <form
          action={setKillSwitchAction.bind(null, !settings.applicationsEnabled)}
          className="mt-3"
        >
          <button
            type="submit"
            className="border-border bg-surface hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {settings.applicationsEnabled
              ? t("killSwitch.disable")
              : t("killSwitch.enable")}
          </button>
        </form>
      </section>

      <section className="border-border bg-surface rounded-lg border p-4">
        <CampaignCreateForm />
      </section>

      <section>
        {campaigns.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
