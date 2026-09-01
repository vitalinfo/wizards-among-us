import type { ComponentType } from "react";

import type { CampaignType, FileKind } from "@/db/enums";

import type { ApplicationRow, StepValues } from "./types";

import { ChildStep } from "./ChildStep";
import { ConsentStep } from "./ConsentStep";
import { DeliveryStep } from "./DeliveryStep";
import { FamilyStep } from "./FamilyStep";
import { GiftStep } from "./GiftStep";
import type { StepProps } from "./types";

export type FormStep = {
  key: string;
  Component: ComponentType<StepProps>;
  // The fields this step must have before it counts as complete — used to
  // resume a returning parent at the first unfinished step.
  fields: readonly string[];
  // Uploads this step asks for and will not advance without. Checked when the
  // step is saved, so a missing photo is caught HERE rather than at the end,
  // where the parent would be told to go back three steps to fix it.
  uploads?: readonly FileKind[];
};

// The «Святий Миколай» form, modelled on the real 2025 Google Form.
const SAINT_NICHOLAS_STEPS: readonly FormStep[] = [
  {
    key: "child",
    Component: ChildStep,
    fields: [
      "childName",
      "childAge",
      "homeTown",
      "homeRegion",
      "currentTown",
      "currentRegion",
      "displacedYear",
    ],
  },
  {
    key: "family",
    Component: FamilyStep,
    fields: ["parentName", "familyStory"],
    uploads: ["idp_certificate"],
  },
  {
    key: "gift",
    Component: GiftStep,
    fields: ["giftDescription", "giftUrls", "giftPrice"],
    uploads: ["letter_photo", "child_with_letter_photo"],
  },
  { key: "delivery", Component: DeliveryStep, fields: ["deliveryInformation"] },
  { key: "consent", Component: ConsentStep, fields: [] },
];

// Which form a campaign renders. Deliberately a lookup rather than one
// hardcoded list: the steps ARE campaign-specific (St Nicholas asks for a
// letter photo; New School Year will ask for school grade and sizes), and
// validation already branches on campaign type via TYPE_FIELDS_SCHEMAS.
//
// A type with no form here renders NOTHING and says so. That matters: without
// it, activating a New School Year campaign would silently show parents the St
// Nicholas form — asking for a letter to St Nicholas in a back-to-school
// campaign — and the passthrough type_fields schema wouldn't object.
const FORMS: Partial<Record<CampaignType, readonly FormStep[]>> = {
  saint_nicholas_day: SAINT_NICHOLAS_STEPS,
};

export function stepsForCampaignType(
  type: CampaignType | null | undefined,
): readonly FormStep[] | null {
  if (!type) {
    return null;
  }
  return FORMS[type] ?? null;
}

// Where to open the form, which depends on WHY the parent is here.
//
// Still filling one in (draft): resume at the first step with a missing answer
// — a parent who closes the tab on a phone should not click "Далі" past three
// completed steps, since the whole point of drafts is that stopping is cheap.
// A draft with nothing missing opens at the last step, where the submit is.
//
// Already submitted: open at the FIRST step. The application is complete by
// definition, so "first incomplete" would fall through to the last step —
// consent and a captcha — which is the least useful place to land when the link
// they followed said «Переглянути або змінити». They came to read it from the
// top, and may still change it: the edit lock only lands on admin approval.
// Uploads a step will not advance without, given what is already present.
export function missingStepUploads(
  step: FormStep,
  present: readonly FileKind[],
): readonly FileKind[] {
  const have = new Set(present);
  return (step.uploads ?? []).filter((kind) => !have.has(kind));
}

export function initialStep(
  steps: readonly FormStep[],
  values: StepValues,
  status: ApplicationRow["status"],
  uploaded: readonly FileKind[] = [],
): number {
  if (status !== "draft") {
    return 0;
  }
  // A step is unfinished if a field is empty OR one of its uploads is missing.
  // Counting fields alone sent a parent whose photos were missing straight to
  // the last step, only to be refused there — which is the long way round to
  // discovering they never uploaded anything.
  const index = steps.findIndex(
    (step) =>
      step.fields.some((field) => {
        const value = values[field];
        return value === undefined || value === null || value === "";
      }) || missingStepUploads(step, uploaded).length > 0,
  );
  return index === -1 ? steps.length - 1 : index;
}
