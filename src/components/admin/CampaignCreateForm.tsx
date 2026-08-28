"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { createCampaignAction } from "@/app/admin/campaigns/actions";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { CAMPAIGN_TYPES } from "@/db/enums";
import { initialCampaignActionState } from "@/features/campaigns/formState";

// A new campaign is always created as a DRAFT — activating is a separate,
// deliberate act, so filling in this form can never accidentally open intake.
export function CampaignCreateForm() {
  const t = useTranslations("admin.campaigns");
  const [state, formAction, pending] = useActionState(
    createCampaignAction,
    initialCampaignActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{t("createTitle")}</h2>

      {state.status === "invalid" ? (
        <p role="alert" className="text-sm text-red-700">
          {t("createError")}
        </p>
      ) : null}

      <SelectField
        id="type"
        name="type"
        label={t("fields.type")}
        placeholder={t("fields.type")}
        options={CAMPAIGN_TYPES.map((type) => ({
          value: type,
          label: t(`types.${type}`),
        }))}
        required
      />
      <TextField id="title" name="title" label={t("fields.title")} required />
      <TextAreaField
        id="description"
        name="description"
        rows={3}
        label={t("fields.description")}
      />
      <TextField
        id="giftPriceCap"
        name="giftPriceCap"
        inputMode="decimal"
        label={t("fields.giftPriceCap")}
        hint={t("fields.giftPriceCapHint")}
      />

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground focus-visible:outline-ring w-fit rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {t("create")}
      </button>
    </form>
  );
}
