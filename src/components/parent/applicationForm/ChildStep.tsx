"use client";

import { useTranslations } from "next-intl";

import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import {
  childAgeOptions,
  displacedYearOptions,
} from "@/lib/applicationFieldOptions";
import { displacedFromRegionOptions, regionOptions } from "@/lib/regionOptions";

import type { StepProps } from "./types";

// Step 1 — «Про дитину». Grouped in a <fieldset>/<legend> so a screen reader
// announces which section these fields belong to.
export function ChildStep({ values, errors }: StepProps) {
  const t = useTranslations("parent.form");
  const tStep = useTranslations("parent.form.steps.child");
  const tRegion = useTranslations("regions");

  const regions = regionOptions(tRegion);
  // Narrower: where a family LEFT is the occupied and front-line oblasts.
  const originRegions = displacedFromRegionOptions(tRegion);
  const ages = childAgeOptions();
  const years = displacedYearOptions();

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

      {/* A bounded list, not a number input: on a phone it's one tap instead
          of a keypad, and it can't produce an age the server will reject. */}
      <SelectField
        id="childAge"
        name="childAge"
        label={tStep("childAge.label")}
        placeholder={t("agePlaceholder")}
        options={ages}
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
        options={originRegions}
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

      <SelectField
        id="displacedYear"
        name="displacedYear"
        label={tStep("displacedYear.label")}
        placeholder={t("yearPlaceholder")}
        options={years}
        defaultValue={values.displacedYear ?? ""}
        error={errors.displacedYear}
        required
      />
    </fieldset>
  );
}
