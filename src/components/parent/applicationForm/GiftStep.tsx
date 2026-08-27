"use client";

import { useTranslations } from "next-intl";

import { TextField } from "@/components/forms/TextField";

import type { StepProps } from "./types";

export function GiftStep({ values, errors, giftPriceCap = null }: StepProps) {
  const t = useTranslations("parent.form.steps.gift");

  // The campaign's budget ceiling is shown up front rather than only failing at
  // submit — in the paper process, an over-budget application was silently
  // deleted, which is exactly the surprise we're removing.
  // numeric(10,2) arrives as "700.00"; show it the way a person writes it.
  const cap = giftPriceCap === null ? null : Number(giftPriceCap);
  const priceHint =
    cap !== null && Number.isFinite(cap)
      ? `${t("giftPrice.hint")} ${t("giftPrice.capHint", { cap })}`
      : t("giftPrice.hint");

  return (
    <fieldset className="flex flex-col gap-5 border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      <TextField
        id="giftDescription"
        name="giftDescription"
        label={t("giftDescription.label")}
        hint={t("giftDescription.hint")}
        defaultValue={values.giftDescription ?? ""}
        error={errors.giftDescription}
        required
      />

      <TextField
        id="giftUrl"
        name="giftUrl"
        type="url"
        inputMode="url"
        label={t("giftUrl.label")}
        hint={t("giftUrl.hint")}
        defaultValue={values.giftUrl ?? ""}
        error={errors.giftUrl}
        required
      />

      <TextField
        id="giftPrice"
        name="giftPrice"
        type="number"
        inputMode="decimal"
        step="0.01"
        min={0}
        label={t("giftPrice.label")}
        hint={priceHint}
        defaultValue={values.giftPrice ?? ""}
        error={errors.giftPrice}
        required
      />
    </fieldset>
  );
}
