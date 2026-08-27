"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";

import type { StepProps } from "./types";

export function DeliveryStep({ values, errors, contact }: StepProps) {
  const t = useTranslations("parent.form.steps.delivery");

  return (
    <fieldset className="flex flex-col gap-5 border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      <TextAreaField
        id="deliveryInformation"
        name="deliveryInformation"
        label={t("deliveryInformation.label")}
        hint={t("deliveryInformation.hint")}
        defaultValue={values.deliveryInformation ?? ""}
        error={errors.deliveryInformation}
        required
      />

      <div className="border-border bg-surface-muted flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">{t("contactTitle")}</h2>

        {/* A Telegram @username is optional, so we only ask for a phone when
            there's no handle — friction lands only where it's needed. */}
        {contact?.method === "telegram" ? (
          <p className="text-muted-foreground text-sm">
            {t("contactTelegram", { username: contact.value })}
          </p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              {t("contactMissing")}
            </p>
            <TextField
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
