import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";

import {
  activateCampaignAction,
  archiveCampaignAction,
  setIntakeAction,
} from "@/app/admin/campaigns/actions";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import type { AdminCampaign } from "@/features/campaigns/adminQueries";

const ACTION =
  "border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const STATUS_TONE: Record<AdminCampaign["status"], string> = {
  draft: "bg-surface-muted text-muted-foreground border-border",
  active: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-surface-muted text-body border-border",
};

// One campaign with the actions valid for its current state.
//
// Every state change asks first: each of these decides whether families can
// apply or whether a whole campaign's applications stay visible, and none of it
// is obvious from a one-word button. The dialog says what will actually happen.
export function CampaignRow({ campaign }: { campaign: AdminCampaign }) {
  const t = useTranslations("admin.campaigns");
  const format = useFormatter();

  const isActive = campaign.status === "active";
  const isArchived = campaign.status === "archived";
  const accepting = campaign.acceptingApplications;

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
          <ConfirmSubmitButton
            action={activateCampaignAction.bind(null, campaign.id)}
            label={t("activate")}
            title={t("confirm.activate.title")}
            message={t("confirm.activate.body")}
            confirmLabel={t("activate")}
            className={ACTION}
          />
        ) : null}

        {isActive ? (
          <ConfirmSubmitButton
            action={setIntakeAction.bind(null, campaign.id, !accepting)}
            label={accepting ? t("closeIntake") : t("openIntake")}
            title={
              accepting
                ? t("confirm.closeIntake.title")
                : t("confirm.openIntake.title")
            }
            message={
              accepting
                ? t("confirm.closeIntake.body")
                : t("confirm.openIntake.body")
            }
            confirmLabel={accepting ? t("closeIntake") : t("openIntake")}
            className={ACTION}
          />
        ) : null}

        {!isArchived ? (
          <ConfirmSubmitButton
            action={archiveCampaignAction.bind(null, campaign.id)}
            label={t("archive")}
            title={t("confirm.archive.title")}
            message={t("confirm.archive.body")}
            confirmLabel={t("archive")}
            className={ACTION}
          />
        ) : null}
      </div>
    </li>
  );
}
