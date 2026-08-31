import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { getAdminCampaign } from "@/features/campaigns/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const campaign = await getAdminCampaign(campaignId);
  if (!campaign) {
    notFound();
  }
  const t = await getTranslations("admin.campaigns");

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Link
          href="/admin/campaigns"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("backCta")}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">{t("editTitle")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{campaign.title}</p>
        </div>
        <CampaignForm campaign={campaign} />
      </main>
    </>
  );
}
