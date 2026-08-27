"use client";

import { useTranslations } from "next-intl";

import { CheckboxField } from "@/components/forms/CheckboxField";
import { RadioGroupField } from "@/components/forms/RadioGroupField";

import type { StepProps } from "./types";

export function ConsentStep({ values, errors }: StepProps) {
  const t = useTranslations("parent.form.steps.consent");

  return (
    <fieldset className="flex flex-col gap-6 border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      {/* Required. Not persisted as a column — it gates submit, so a submitted
          application has it by definition (submitted_at is the record). */}
      <CheckboxField
        id="consent"
        name="consent"
        value="true"
        label={t("consent.label")}
        hint={t("consent.hint")}
        error={errors.consent}
        required
      />

      {/* SEPARATE and genuinely optional: either answer is valid, so this must
          never be a required "yes". */}
      <RadioGroupField
        name="socialMediaConsent"
        legend={t("socialMediaConsent.legend")}
        hint={t("socialMediaConsent.hint")}
        error={errors.socialMediaConsent}
        defaultValue={
          values.socialMediaConsent === undefined
            ? undefined
            : String(values.socialMediaConsent)
        }
        options={[
          { value: "true", label: t("socialMediaConsent.yes") },
          { value: "false", label: t("socialMediaConsent.no") },
        ]}
        required
      />
    </fieldset>
  );
}
