"use client";

import { useTranslations } from "next-intl";

import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { regionOptions } from "@/lib/regionOptions";

import type { StepProps } from "./types";

// Step 1 — «Про дитину». Grouped in a <fieldset>/<legend> so a screen reader
// announces which section these fields belong to.
export function ChildStep({ values, errors }: StepProps) {
  const t = useTranslations("parent.form");
  const tStep = useTranslations("parent.form.steps.child");
  const tRegion = useTranslations("regions");

  const regions = regionOptions(tRegion);

  return (
    <fieldset className="flex flex-col gap-5 border-0 p-0">
      <legend className="sr-only">{tStep("title")}</legend>
      <p className="text-muted-foreground text-sm">{tStep("intro")}</p>

      <TextField
        id="childName"
        name="childName"
        label={tStep("childName.label")}
        hint={tStep("childName.hint")}
        defaultValue={values.childName ?? ""}
        error={errors.childName}
        autoComplete="off"
        required
      />

      <TextField
        id="childAge"
        name="childAge"
        type="number"
        inputMode="numeric"
        min={0}
        max={18}
        label={tStep("childAge.label")}
        hint={tStep("childAge.hint")}
        defaultValue={values.childAge ?? ""}
        error={errors.childAge}
        required
      />

      <TextField
        id="homeTown"
        name="homeTown"
        label={tStep("homeTown.label")}
        hint={tStep("homeTown.hint")}
        defaultValue={values.homeTown ?? ""}
        error={errors.homeTown}
        required
      />

      <SelectField
        id="homeRegion"
        name="homeRegion"
        label={tStep("homeRegion.label")}
        placeholder={t("regionPlaceholder")}
        options={regions}
        defaultValue={values.homeRegion ?? ""}
        error={errors.homeRegion}
        required
      />

      <TextField
        id="currentTown"
        name="currentTown"
        label={tStep("currentTown.label")}
        hint={tStep("currentTown.hint")}
        defaultValue={values.currentTown ?? ""}
        error={errors.currentTown}
        required
      />

      <SelectField
        id="currentRegion"
        name="currentRegion"
        label={tStep("currentRegion.label")}
        placeholder={t("regionPlaceholder")}
        options={regions}
        defaultValue={values.currentRegion ?? ""}
        error={errors.currentRegion}
        required
      />

      <TextField
        id="displacedYear"
        name="displacedYear"
        type="number"
        inputMode="numeric"
        min={2014}
        max={new Date().getFullYear()}
        label={tStep("displacedYear.label")}
        hint={tStep("displacedYear.hint")}
        defaultValue={values.displacedYear ?? ""}
        error={errors.displacedYear}
        required
      />
    </fieldset>
  );
}
