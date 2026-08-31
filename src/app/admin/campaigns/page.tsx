import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { CampaignRow, isCampaignConfirm } from "@/components/admin/CampaignRow";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirm?: string; id?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const t = await getTranslations("admin.campaigns");
  const [query, campaigns] = await Promise.all([searchParams, listCampaigns()]);

  // Which row (if any) is currently asking for confirmation. Both halves must
  // match, so a stale link can't put a different campaign into the confirm
  // state — and the action itself is still re-authorized server-side.
  const pendingConfirm = isCampaignConfirm(query.confirm)
    ? query.confirm
    : null;

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">{t("title")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
          </div>
          <Link
            href="/admin/campaigns/new"
            className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("newCta")}
          </Link>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                pending={query.id === campaign.id ? pendingConfirm : null}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
