"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";

import type { StepProps } from "./types";

export function FamilyStep({ values, errors }: StepProps) {
  const t = useTranslations("parent.form.steps.family");

  return (
    <fieldset className="flex flex-col gap-5 border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      <TextField
        id="parentName"
        name="parentName"
        label={t("parentName.label")}
        hint={t("parentName.hint")}
        defaultValue={values.parentName ?? ""}
        error={errors.parentName}
        autoComplete="name"
        required
      />

      <TextAreaField
        id="familyStory"
        name="familyStory"
        label={t("familyStory.label")}
        hint={t("familyStory.hint")}
        defaultValue={values.familyStory ?? ""}
        error={errors.familyStory}
        required
      />
    </fieldset>
  );
}
