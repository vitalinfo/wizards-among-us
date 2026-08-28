import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminExportPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const [t, tStatus, campaigns] = await Promise.all([
    getTranslations("admin.export"),
    getTranslations("admin.campaigns.status"),
    listCampaigns(),
  ]);

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        {/* The two scopes are described in full next to their buttons, not
            behind a tooltip: the difference between them is who can be
            identified if the file leaves the coordinator's laptop. */}
        <div className="border-border bg-surface-muted rounded-lg border p-4 text-sm">
          <p>
            <strong>{t("scopes.coordination.title")}</strong>{" "}
            {t("scopes.coordination.body")}
          </p>
          <p className="mt-2">
            <strong>{t("scopes.full.title")}</strong> {t("scopes.full.body")}
          </p>
          <p className="text-muted-foreground mt-2">{t("noFiles")}</p>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="border-border bg-surface rounded-lg border p-4"
              >
                <h2 className="font-semibold">{campaign.title}</h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {tStatus(campaign.status)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <a
                    href={`/admin/export/download?campaignId=${campaign.id}&scope=coordination`}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {t("scopes.coordination.download")}
                  </a>
                  <a
                    href={`/admin/export/download?campaignId=${campaign.id}&scope=full`}
                    className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {t("scopes.full.download")}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
