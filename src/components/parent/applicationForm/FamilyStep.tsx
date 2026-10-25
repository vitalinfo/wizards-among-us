"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { UploadField } from "@/components/forms/UploadField";

import type { StepProps } from "./types";

// Step 2 — «Історія» (Figma 147:7166): who will receive the gift, the
// family's story, and the ВПО certificate.
export function FamilyStep({
  values,
  errors,
  applicationId,
  files,
  defaultParentName,
}: StepProps) {
  const t = useTranslations("parent.form.steps.family");

  return (
    <fieldset className="flex flex-col border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>

      {/* Half the row from lg, as drawn. */}
      <div className="lg:max-w-[504px]">
        <TextField
          look="cabinet"
          id="parentName"
          name="parentName"
          label={t("parentName.label")}
          placeholder={t("parentName.hint")}
          // Prefilled from the Telegram profile until the parent types their
          // own — a provider display name can be a nickname or one word, and
          // the gift is handed over against this name.
          defaultValue={values.parentName ?? defaultParentName ?? ""}
          error={errors.parentName}
          autoComplete="name"
          required
        />
      </div>

      <TextAreaField
        look="cabinet"
        id="familyStory"
        name="familyStory"
        // 150px, the design's box (~146).
        rows={6}
        label={t("familyStory.label")}
        placeholder={t("familyStory.hint")}
        defaultValue={values.familyStory ?? ""}
        error={errors.familyStory}
        required
      />

      {/* ADMIN-ONLY once uploaded — never shown to a volunteer, which the hint
          tells the parent explicitly. */}
      {applicationId ? (
        <UploadField
          applicationId={applicationId}
          kind="idp_certificate"
          label={t("idpCertificate.label")}
          hint={t("idpCertificate.hint")}
          existing={files?.idp_certificate}
          required
          variant="dropzone"
        />
      ) : null}
    </fieldset>
  );
}
