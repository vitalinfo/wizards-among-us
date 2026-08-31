"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import {
  createCampaignAction,
  updateCampaignAction,
} from "@/app/admin/campaigns/actions";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { CAMPAIGN_TYPES } from "@/db/enums";
import type { AdminCampaign } from "@/features/campaigns/adminQueries";
import { initialCampaignActionState } from "@/features/campaigns/formState";

// Create and edit are the same fields, so they're the same form. A new campaign
// is always created as a DRAFT — activating is a separate, deliberate act, so
// filling this in can never accidentally open intake.
//
// The TYPE decides which questions a parent answers and how type_fields is
// validated, so it is editable only while the campaign is still a draft. Past
// that it renders as read-only text plus a hidden input, and the server
// re-checks that the value didn't change — the lock is server-side, the
// read-only rendering is only the explanation.
export function CampaignForm({ campaign }: { campaign?: AdminCampaign }) {
  const t = useTranslations("admin.campaigns");
  const editing = campaign !== undefined;
  const typeLocked = editing && campaign.status !== "draft";

  const [state, formAction, pending] = useActionState(
    editing
      ? updateCampaignAction.bind(null, campaign.id)
      : createCampaignAction,
    initialCampaignActionState,
  );

  const error =
    state.status === "invalid" ||
    state.status === "type_locked" ||
    state.status === "not_found"
      ? t(`errors.${state.status}`)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      {typeLocked ? (
        <div>
          <p className="text-sm font-medium">{t("fields.type")}</p>
          <p className="mt-0.5 text-sm">{t(`types.${campaign.type}`)}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {t("fields.typeLocked")}
          </p>
          <input type="hidden" name="type" value={campaign.type} />
        </div>
      ) : (
        <SelectField
          id="type"
          name="type"
          label={t("fields.type")}
          placeholder={t("fields.type")}
          defaultValue={campaign?.type}
          options={CAMPAIGN_TYPES.map((type) => ({
            value: type,
            label: t(`types.${type}`),
          }))}
          required
        />
      )}

      <TextField
        id="title"
        name="title"
        label={t("fields.title")}
        defaultValue={campaign?.title ?? ""}
        required
      />
      <TextAreaField
        id="description"
        name="description"
        rows={3}
        label={t("fields.description")}
        defaultValue={campaign?.description ?? ""}
      />
      <TextField
        id="giftPriceCap"
        name="giftPriceCap"
        inputMode="decimal"
        label={t("fields.giftPriceCap")}
        hint={t("fields.giftPriceCapHint")}
        defaultValue={campaign?.giftPriceCap ?? ""}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {editing ? t("save") : t("create")}
        </button>
        <Link
          href="/admin/campaigns"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
