"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { updateApplicationAction } from "@/app/admin/applications/actions";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import type { applications } from "@/db/schema";
import { initialAdminEditState } from "@/features/applications/adminEditState";
import { regionOptions } from "@/lib/regionOptions";

type Application = typeof applications.$inferSelect;

// Admin edit of an application's content. One page rather than the parent's
// multi-step wizard: an admin is fixing a known field, not being walked through
// a form for the first time, and there is no captcha or upload step here.
//
// Status, campaign and parent are deliberately absent — decisions have their own
// flow, so a typo fix can never move an application through the workflow.
export function AdminApplicationForm({
  application,
  giftUrls,
}: {
  application: Application;
  giftUrls: string[];
}) {
  const t = useTranslations("admin.applications");
  const tForm = useTranslations("parent.form");
  const tErrors = useTranslations("admin.applications.editErrors");
  const tRegions = useTranslations("regions");

  const [state, formAction, pending] = useActionState(
    updateApplicationAction.bind(null, application.id),
    initialAdminEditState,
  );

  // Sorted by Ukrainian label — the enum's slug order is Latin.
  const regions = regionOptions(tRegions);

  // A message for a field, if the last submit rejected it.
  const err = (field: string) => {
    const key = state.errors[field];
    if (!key) {
      return undefined;
    }
    // Unknown zod messages fall back to a generic one rather than throwing on a
    // missing translation key.
    return key === "required" || key === "gift_price_over_cap"
      ? tErrors(key)
      : tErrors("invalid");
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "invalid" || state.status === "not_found" ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {tErrors(state.status === "not_found" ? "not_found" : "summary")}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">
          {t("sections.child")}
        </legend>
        <TextField
          id="childName"
          name="childName"
          label={t("fields.childName")}
          defaultValue={application.childName ?? ""}
          error={err("childName")}
        />
        <TextField
          id="childAge"
          name="childAge"
          inputMode="numeric"
          label={t("fields.childAge")}
          defaultValue={application.childAge ?? ""}
          error={err("childAge")}
        />
        <TextField
          id="homeTown"
          name="homeTown"
          label={t("fields.homeTown")}
          defaultValue={application.homeTown ?? ""}
          error={err("homeTown")}
        />
        <SelectField
          id="homeRegion"
          name="homeRegion"
          label={t("fields.homeRegion")}
          placeholder={tForm("regionPlaceholder")}
          options={regions}
          defaultValue={application.homeRegion ?? ""}
          error={err("homeRegion")}
        />
        <TextField
          id="currentTown"
          name="currentTown"
          label={t("fields.currentTown")}
          defaultValue={application.currentTown ?? ""}
          error={err("currentTown")}
        />
        <SelectField
          id="currentRegion"
          name="currentRegion"
          label={t("fields.currentRegion")}
          placeholder={tForm("regionPlaceholder")}
          options={regions}
          defaultValue={application.currentRegion ?? ""}
          error={err("currentRegion")}
        />
        <TextField
          id="displacedYear"
          name="displacedYear"
          inputMode="numeric"
          label={t("fields.displacedYear")}
          defaultValue={application.displacedYear ?? ""}
          error={err("displacedYear")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">
          {t("sections.family")}
        </legend>
        <TextField
          id="parentName"
          name="parentName"
          label={t("fields.parentName")}
          defaultValue={application.parentName ?? ""}
          error={err("parentName")}
        />
        <TextAreaField
          id="familyStory"
          name="familyStory"
          rows={4}
          label={t("fields.familyStory")}
          defaultValue={application.familyStory ?? ""}
          error={err("familyStory")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">
          {t("sections.gift")}
        </legend>
        <TextField
          id="giftDescription"
          name="giftDescription"
          label={t("fields.giftDescription")}
          defaultValue={application.giftDescription ?? ""}
          error={err("giftDescription")}
        />
        <TextField
          id="giftPrice"
          name="giftPrice"
          inputMode="decimal"
          label={t("fields.giftPrice")}
          defaultValue={application.giftPrice ?? ""}
          error={err("giftPrice")}
        />
        <TextAreaField
          id="giftUrls"
          name="giftUrls"
          rows={3}
          label={t("fields.giftUrls")}
          hint={tForm("steps.gift.giftUrls.hint")}
          defaultValue={giftUrls.join("\n")}
          error={err("giftUrls")}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">
          {t("sections.delivery")}
        </legend>
        <TextAreaField
          id="deliveryInformation"
          name="deliveryInformation"
          rows={3}
          label={t("fields.deliveryInformation")}
          defaultValue={application.deliveryInformation ?? ""}
          error={err("deliveryInformation")}
        />
        <SelectField
          id="socialMediaConsent"
          name="socialMediaConsent"
          label={t("fields.socialMediaConsent")}
          placeholder={t("empty_value")}
          options={[
            { value: "true", label: t("yes") },
            { value: "false", label: t("no") },
          ]}
          defaultValue={
            application.socialMediaConsent === null
              ? ""
              : String(application.socialMediaConsent)
          }
          error={err("socialMediaConsent")}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {t("edit.save")}
        </button>
        <Link
          href={`/admin/applications/${application.id}`}
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("edit.cancel")}
        </Link>
      </div>
    </form>
  );
}
