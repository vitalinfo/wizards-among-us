import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { CampaignRow, isCampaignConfirm } from "@/components/admin/CampaignRow";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { listCampaigns } from "@/features/campaigns/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import {
  activateCampaignAction,
  archiveCampaignAction,
  setIntakeAction,
} from "./actions";

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

  // Which action is being confirmed, from the query string. Both halves must
  // match a real row, so a crafted or stale link resolves to "nothing pending"
  // rather than a modal for a campaign that isn't there.
  const pendingConfirm = isCampaignConfirm(query.confirm)
    ? query.confirm
    : null;
  const target =
    pendingConfirm && query.id
      ? (campaigns.find((campaign) => campaign.id === query.id) ?? null)
      : null;

  // The action comes from the CONFIRM value, not from the campaign's current
  // state: if it changed under the admin between opening the prompt and
  // confirming, the action they actually agreed to is the one that runs.
  const confirmAction =
    target && pendingConfirm
      ? {
          activate: activateCampaignAction.bind(null, target.id),
          archive: archiveCampaignAction.bind(null, target.id),
          openIntake: setIntakeAction.bind(null, target.id, true),
          closeIntake: setIntakeAction.bind(null, target.id, false),
        }[pendingConfirm]
      : null;

  return (
    <>
      <AdminNav />
      {/* inert while the modal is up: without it Tab walks into the buttons
          underneath the overlay — the classic fake-modal bug. Needs no JS. */}
      <main
        inert={confirmAction !== null}
        className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6"
      >
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
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </ul>
        )}
      </main>

      {confirmAction && pendingConfirm ? (
        <ConfirmModal
          action={confirmAction}
          title={t(`confirm.${pendingConfirm}.title`)}
          message={t(`confirm.${pendingConfirm}.body`)}
          confirmLabel={t(pendingConfirm)}
          cancelHref="/admin/campaigns"
        />
      ) : null}
    </>
  );
}
