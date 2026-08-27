"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  saveApplicationDraft,
  submitApplicationAction,
} from "@/app/parent/applications/[id]/actions";
import { Button } from "@/components/ui/Button";
import type { ContactMethod } from "@/db/enums";
import {
  initialSaveDraftState,
  initialSubmitState,
} from "@/features/applications/formState";

import { ChildStep } from "./ChildStep";
import { ConsentStep } from "./ConsentStep";
import { DeliveryStep } from "./DeliveryStep";
import { FamilyStep } from "./FamilyStep";
import { GiftStep } from "./GiftStep";
import { toStepValues, type ApplicationRow, type StepValues } from "./types";

// The multistep application form, mirroring the sections parents already know
// from the paper/Google form.
//
// Every step is a real <form> posting to a server action, so each one SAVES A
// DRAFT before the next appears — a parent can close the tab on a phone and
// come back. Only the last step submits.
const STEPS = [
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
    fields: ["giftDescription", "giftUrl", "giftPrice"],
  },
  { key: "delivery", Component: DeliveryStep, fields: ["deliveryInformation"] },
  { key: "consent", Component: ConsentStep, fields: [] },
] as const;

// A parent who closes the tab and comes back should resume where they stopped,
// not click "Далі" past three completed steps — the whole point of drafts is
// that stopping is cheap. Lands on the first step with a missing answer.
function firstIncompleteStep(values: StepValues): number {
  const index = STEPS.findIndex((step) =>
    step.fields.some((field) => {
      const value = values[field];
      return value === undefined || value === null || value === "";
    }),
  );
  return index === -1 ? STEPS.length - 1 : index;
}

export function ApplicationForm({
  application,
  contact,
  giftPriceCap,
}: {
  application: ApplicationRow;
  contact: { method: ContactMethod; value: string } | null;
  giftPriceCap: string | null;
}) {
  const t = useTranslations("parent.form");
  const tErrors = useTranslations("parent.form.errors");
  const tBlocked = useTranslations("parent.applications.blocked");
  const tConsent = useTranslations("parent.form.steps.consent");

  const values = toStepValues(application);
  const [stepIndex, setStepIndex] = useState(() => firstIncompleteStep(values));
  const [saveState, setSaveState] = useState(initialSaveDraftState);
  const [submitState, setSubmitState] = useState(initialSubmitState);
  const [pending, startTransition] = useTransition();
  const alertRef = useRef<HTMLDivElement>(null);

  const isLast = stepIndex === STEPS.length - 1;
  const { Component } = STEPS[stepIndex];
  const failed =
    saveState.status === "invalid" ||
    submitState.status === "invalid" ||
    submitState.status === "blocked";

  // The step advances HERE, after the save resolves — not in an effect watching
  // the result, which would be a cascading render. It also means we only ever
  // advance on a successful save: a rejected step keeps the parent in place
  // instead of carrying an invalid answer forward to fail again at submit.
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      if (isLast) {
        setSubmitState(await submitApplicationAction(submitState, formData));
        return;
      }
      const result = await saveApplicationDraft(saveState, formData);
      setSaveState(result);
      if (result.status === "saved") {
        setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      }
    });
  };

  // Move focus to the message so a keyboard or screen-reader user isn't
  // stranded at the bottom of the form wondering why nothing happened.
  useEffect(() => {
    if (failed) {
      alertRef.current?.focus();
    }
  }, [failed, saveState, submitState]);

  // zod issue codes → Ukrainian copy. Mapped here, so no user-facing strings
  // are produced on the server.
  const messageFor = (code: string | undefined) => {
    if (!code) {
      return undefined;
    }
    if (code.includes("url")) {
      return tErrors("invalid_url");
    }
    if (code === "gift_price_over_cap" || code === "too_big") {
      return tErrors("out_of_range");
    }
    if (code === "too_small" || code === "invalid_type") {
      return tErrors("required");
    }
    return tErrors("invalid");
  };

  const errors = Object.fromEntries(
    Object.entries({ ...saveState.errors, ...submitState.errors }).map(
      ([field, code]) => [field, messageFor(code)],
    ),
  );

  return (
    <form action={handleSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="applicationId" value={application.id} />

      <p className="text-muted-foreground text-sm">
        {t("stepOf", { current: stepIndex + 1, total: STEPS.length })}
      </p>

      {failed ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {submitState.blockReason
            ? tBlocked(submitState.blockReason)
            : t("saveError")}
        </div>
      ) : null}

      <Component
        values={values}
        errors={errors}
        contact={contact}
        giftPriceCap={giftPriceCap}
      />

      <div className="flex flex-wrap items-center gap-3">
        {stepIndex > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStepIndex((current) => current - 1)}
          >
            {t("back")}
          </Button>
        ) : null}

        <Button type="submit" disabled={pending}>
          {isLast
            ? pending
              ? tConsent("submitting")
              : tConsent("submit")
            : t("next")}
        </Button>
      </div>
    </form>
  );
}
