import type { ComponentType } from "react";

import type { CampaignType } from "@/db/enums";

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
  },
  {
    key: "gift",
    Component: GiftStep,
    fields: ["giftDescription", "giftUrls", "giftPrice"],
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
