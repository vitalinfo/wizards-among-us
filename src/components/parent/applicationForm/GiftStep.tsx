"use client";

import { useTranslations } from "next-intl";

import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { UploadField } from "@/components/forms/UploadField";

import type { StepProps } from "./types";

// Step 3 — «Мрія» (Figma 147:7166): the wish, the shop links, the price, and
// the two photos.
export function GiftStep({
  values,
  errors,
  giftPriceCap = null,
  applicationId,
  files,
}: StepProps) {
  const t = useTranslations("parent.form.steps.gift");

  // The campaign's budget ceiling is shown up front rather than only failing at
  // submit — in the paper process, an over-budget application was silently
  // deleted, which is exactly the surprise we're removing. The design's
  // placeholder has no room for a second line, so the cap joins it.
  // numeric(10,2) arrives as "700.00"; show it the way a person writes it.
  const cap = giftPriceCap === null ? null : Number(giftPriceCap);
  const pricePlaceholder =
    cap !== null && Number.isFinite(cap)
      ? t("giftPrice.capHint", { cap })
      : t("giftPrice.hint");

  return (
    <fieldset className="flex flex-col border-0 p-0">
      <legend className="sr-only">{t("title")}</legend>

      {/* A textarea: a wish is often a few items with sizes and colours, and a
          single-line input hides everything past the first few words while the
          parent is still writing it. */}
      <TextAreaField
        look="cabinet"
        id="giftDescription"
        name="giftDescription"
        // 150px, the design's box (~146).
        rows={6}
        label={t("giftDescription.label")}
        placeholder={t("giftDescription.hint")}
        defaultValue={values.giftDescription ?? ""}
        error={errors.giftDescription}
        required
      />

      {/* A textarea rather than a repeating input group: one link per line is
          easier to paste into on a phone than add/remove controls, and it
          degrades to a plain field without JavaScript. One line tall, as
          drawn; it grows when a second link is pasted. */}
      <TextAreaField
        look="cabinet"
        id="giftUrls"
        name="giftUrls"
        rows={1}
        label={t("giftUrls.label")}
        placeholder={t("giftUrls.hint")}
        defaultValue={values.giftUrls ?? ""}
        error={errors.giftUrls}
        required
      />

      <div className="lg:max-w-[504px]">
        <TextField
          look="cabinet"
          id="giftPrice"
          name="giftPrice"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          label={t("giftPrice.label")}
          placeholder={pricePlaceholder}
          defaultValue={values.giftPrice ?? ""}
          error={errors.giftPrice}
          required
        />
      </div>

      {applicationId ? (
        <>
          <UploadField
            applicationId={applicationId}
            kind="letter_photo"
            label={t("letterPhoto.label")}
            hint={t("letterPhoto.hint")}
            existing={files?.letter_photo}
            required
            variant="dropzone"
          />
          <UploadField
            applicationId={applicationId}
            kind="child_with_letter_photo"
            label={t("childWithLetterPhoto.label")}
            hint={t("childWithLetterPhoto.hint")}
            existing={files?.child_with_letter_photo}
            required
            variant="dropzone"
          />
        </>
      ) : null}
    </fieldset>
  );
}
