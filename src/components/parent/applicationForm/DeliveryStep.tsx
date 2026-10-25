"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";

import type { StepProps } from "./types";

// Step 4 — «Доставка» (Figma 147:7166): where the gift goes, and how the
// volunteer reaches the family.
export function DeliveryStep({ values, errors, contact }: StepProps) {
  const t = useTranslations("parent.form.steps.delivery");

  return (
    <fieldset className="flex flex-col border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>

      <TextAreaField
        look="cabinet"
        id="deliveryInformation"
        name="deliveryInformation"
        // 150px, the design's box (~146).
        rows={6}
        label={t("deliveryInformation.label")}
        placeholder={t("deliveryInformation.hint")}
        defaultValue={values.deliveryInformation ?? ""}
        error={errors.deliveryInformation}
        required
      />

      {/* A Telegram @username is optional, so we only ask for a phone when
          there's no handle — friction lands only where it's needed. With a
          handle, the design draws the answer in a field's shape; it is a
          statement, not an input, so it is text in a box rather than a
          read-only control a screen reader would offer to edit. */}
      <div className="lg:max-w-[504px]">
        {contact?.method === "telegram" ? (
          <div className="flex flex-col gap-2 py-3">
            <p className="text-sm tracking-[-0.06em]">{t("contactTitle")}</p>
            <p className="border-divider bg-surface-muted text-muted-foreground flex min-h-[54px] items-center rounded-lg border px-4 text-sm tracking-[-0.06em]">
              {t("contactTelegram", { username: contact.value })}
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mt-3 text-sm">
              {t("contactMissing")}
            </p>
            <TextField
              look="cabinet"
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+380671234567"
              label={t("phone.label")}
              hint={t("phone.hint")}
              defaultValue={contact?.value ?? ""}
              error={errors.phone}
              required
            />
          </>
        )}
      </div>
    </fieldset>
  );
}
