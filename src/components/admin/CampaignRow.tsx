import { useFormatter, useTranslations } from "next-intl";

import {
  activateCampaignAction,
  archiveCampaignAction,
  setIntakeAction,
} from "@/app/admin/campaigns/actions";
import type { AdminCampaign } from "@/features/campaigns/adminQueries";

const ACTION =
  "border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const STATUS_TONE: Record<AdminCampaign["status"], string> = {
  draft: "bg-surface-muted text-muted-foreground border-border",
  active: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-surface-muted text-body border-border",
};

// One campaign with the actions valid for its current state. Each is a <form>
// posting to a server action, so it works without JavaScript and the
// authorization check runs server-side regardless of what the UI shows.
export function CampaignRow({ campaign }: { campaign: AdminCampaign }) {
  const t = useTranslations("admin.campaigns");
  const format = useFormatter();

  const isActive = campaign.status === "active";
  const isArchived = campaign.status === "archived";

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
            {campaign.acceptingApplications
              ? t("intakeOpen")
              : t("intakeClosed")}
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

      <div className="flex flex-wrap gap-2">
        {!isActive ? (
          <form action={activateCampaignAction.bind(null, campaign.id)}>
            <button type="submit" className={ACTION}>
              {t("activate")}
            </button>
          </form>
        ) : null}

        {isActive ? (
          <form
            action={setIntakeAction.bind(
              null,
              campaign.id,
              !campaign.acceptingApplications,
            )}
          >
            <button type="submit" className={ACTION}>
              {campaign.acceptingApplications
                ? t("closeIntake")
                : t("openIntake")}
            </button>
          </form>
        ) : null}

        {!isArchived ? (
          <form action={archiveCampaignAction.bind(null, campaign.id)}>
            <button type="submit" className={ACTION}>
              {t("archive")}
            </button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
