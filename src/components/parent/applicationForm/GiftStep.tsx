"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
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

      {/* A textarea rather than a repeating input group: one link per line is
          easier to paste into on a phone than add/remove controls, and it
          degrades to a plain field without JavaScript. */}
      <TextAreaField
        id="giftUrls"
        name="giftUrls"
        rows={3}
        label={t("giftUrls.label")}
        hint={t("giftUrls.hint")}
        defaultValue={values.giftUrls ?? ""}
        error={errors.giftUrls}
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
