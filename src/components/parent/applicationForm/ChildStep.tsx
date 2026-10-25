"use client";

import { useTranslations } from "next-intl";

import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import {
  childAgeOptions,
  childGenderOptions,
  displacedYearOptions,
} from "@/lib/applicationFieldOptions";
import { displacedFromRegionOptions, regionOptions } from "@/lib/regionOptions";

import type { StepProps } from "./types";

// Step 1 — «Особиста інформація» (Figma 147:7166). Two columns from lg, the
// pairs as drawn: name | age, the town left | its oblast, the town now | its
// oblast. Grouped in a <fieldset>/<legend> so a screen reader announces which
// section these fields belong to.
//
// The hints are the placeholders, as drawn — and they are the privacy notes
// a parent consents on («Чарівник до вибору бачить лише ім'я»), so they are
// worded to match what the app actually shows.
export function ChildStep({ values, errors }: StepProps) {
  const t = useTranslations("parent.form");
  const tStep = useTranslations("parent.form.steps.child");
  const tRegion = useTranslations("regions");
  const tGender = useTranslations("genders");

  const regions = regionOptions(tRegion);
  // Narrower: where a family LEFT is the occupied and front-line oblasts.
  const originRegions = displacedFromRegionOptions(tRegion);
  const ages = childAgeOptions();
  const genders = childGenderOptions(tGender);
  const years = displacedYearOptions();

  return (
    <fieldset className="grid grid-cols-1 gap-x-[14px] border-0 p-0 lg:grid-cols-2">
      <legend className="sr-only">{tStep("title")}</legend>

      <TextField
        look="cabinet"
        id="childName"
        name="childName"
        label={tStep("childName.label")}
        placeholder={tStep("childName.hint")}
        defaultValue={values.childName ?? ""}
        error={errors.childName}
        autoComplete="off"
        required
      />

      {/* A bounded list, not a number input: on a phone it's one tap instead
          of a keypad, and it can't produce an age the server will reject. */}
      <SelectField
        look="cabinet"
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
        look="cabinet"
        id="homeTown"
        name="homeTown"
        label={tStep("homeTown.label")}
        placeholder={tStep("homeTown.hint")}
        defaultValue={values.homeTown ?? ""}
        error={errors.homeTown}
        required
      />

      <SelectField
        look="cabinet"
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
        look="cabinet"
        id="currentTown"
        name="currentTown"
        label={tStep("currentTown.label")}
        placeholder={tStep("currentTown.hint")}
        defaultValue={values.currentTown ?? ""}
        error={errors.currentTown}
        required
      />

      <SelectField
        look="cabinet"
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
        look="cabinet"
        id="displacedYear"
        name="displacedYear"
        label={tStep("displacedYear.label")}
        placeholder={t("yearPlaceholder")}
        options={years}
        defaultValue={values.displacedYear ?? ""}
        error={errors.displacedYear}
        required
      />

      {/* Not in the design, which predates the field: it is what draws the
          child's icon for a volunteer. Beside the year, the one free slot. */}
      <SelectField
        look="cabinet"
        id="childGender"
        name="childGender"
        label={tStep("childGender.label")}
        placeholder={t("genderPlaceholder")}
        options={genders}
        defaultValue={values.childGender ?? ""}
        error={errors.childGender}
        required
      />
    </fieldset>
  );
}
