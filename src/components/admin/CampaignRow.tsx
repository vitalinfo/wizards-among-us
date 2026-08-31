import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";

import type { AdminCampaign } from "@/features/campaigns/adminQueries";

// Which action this row is currently asking about, read from the query string.
export const CAMPAIGN_CONFIRMS = [
  "activate",
  "archive",
  "openIntake",
  "closeIntake",
] as const;
export type CampaignConfirm = (typeof CAMPAIGN_CONFIRMS)[number];

export function isCampaignConfirm(value: unknown): value is CampaignConfirm {
  return CAMPAIGN_CONFIRMS.includes(value as CampaignConfirm);
}

const ACTION =
  "border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const STATUS_TONE: Record<AdminCampaign["status"], string> = {
  draft: "bg-surface-muted text-muted-foreground border-border",
  active: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-surface-muted text-body border-border",
};

// One campaign with the actions valid for its current state.
//
// Every state change confirms first: each decides whether families can apply,
// or whether a whole campaign's applications stay visible, and none of that is
// obvious from a one-word button. The triggers are plain links to ?confirm=…;
// the page renders the modal for whichever one is named, so nothing here needs
// client JavaScript.
export async function CampaignRow({ campaign }: { campaign: AdminCampaign }) {
  const t = await getTranslations("admin.campaigns");
  const format = await getFormatter();

  const isActive = campaign.status === "active";
  const isArchived = campaign.status === "archived";
  const accepting = campaign.acceptingApplications;
  // Where a trigger points; "cancel" returns to the bare list.
  const confirmHref = (confirm: CampaignConfirm) =>
    `/admin/campaigns?confirm=${confirm}&id=${campaign.id}`;

  const intakeConfirm: CampaignConfirm = accepting
    ? "closeIntake"
    : "openIntake";
  const intakeLabel = accepting ? t("closeIntake") : t("openIntake");

  return (
    <li className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{campaign.title}</span>
        <span className="text-muted-foreground text-sm">
          {t(`types.${campaign.type}`)}
        </span>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[campaign.status]}`}
        >
          {t(`status.${campaign.status}`)}
        </span>
        {isActive ? (
          <span className="text-muted-foreground text-xs">
            {accepting ? t("intakeOpen") : t("intakeClosed")}
          </span>
        ) : null}
      </div>

      <p className="text-muted-foreground text-xs">
        {campaign.giftPriceCap
          ? t("capLabel", { cap: Number(campaign.giftPriceCap) })
          : t("noCap")}
        {" · "}
        {format.dateTime(campaign.createdAt, "short")}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/campaigns/${campaign.id}/edit`} className={ACTION}>
          {t("editCta")}
        </Link>
        {!isActive ? (
          <Link href={confirmHref("activate")} className={ACTION}>
            {t("activate")}
          </Link>
        ) : null}
        {isActive ? (
          <Link href={confirmHref(intakeConfirm)} className={ACTION}>
            {intakeLabel}
          </Link>
        ) : null}
        {!isArchived ? (
          <Link href={confirmHref("archive")} className={ACTION}>
            {t("archive")}
          </Link>
        ) : null}
        {/* A plain <a>, not <Link>: the route answers with
            Content-Disposition: attachment, so the browser saves the file and
            leaves the page where it is. Admin-gated and audit-logged there. */}
        <a
          href={`/admin/export/download?campaignId=${campaign.id}`}
          className={ACTION}
        >
          {t("exportCta")}
        </a>
      </div>
    </li>
  );
}
