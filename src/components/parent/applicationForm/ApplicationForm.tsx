"use client";

import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  saveApplicationDraft,
  submitApplicationAction,
} from "@/app/parent/applications/[applicationId]/actions";
import { Button } from "@/components/ui/Button";
import type { ContactMethod } from "@/db/enums";
import {
  initialSaveDraftState,
  initialSubmitState,
} from "@/features/applications/formState";

import { initialStep, type FormStep } from "./steps";
import { toStepValues, type ApplicationRow } from "./types";

// The multistep application form, mirroring the sections parents already know
// from the paper/Google form.
//
// Every step is a real <form> posting to a server action, so each one SAVES A
// DRAFT before the next appears — a parent can close the tab on a phone and
// come back. Only the last step submits.
export function ApplicationForm({
  application,
  contact,
  giftPriceCap,
  files,
  turnstileSiteKey,
  steps,
}: {
  application: ApplicationRow;
  contact: { method: ContactMethod; value: string } | null;
  giftPriceCap: string | null;
  files: Record<string, { id: string; kind: string; contentType: string }>;
  turnstileSiteKey: string | null;
  // The form for THIS campaign's type — the page resolves it, so an
  // unimplemented type never reaches this component.
  steps: readonly FormStep[];
}) {
  const t = useTranslations("parent.form");
  const tErrors = useTranslations("parent.form.errors");
  const tBlocked = useTranslations("parent.applications.blocked");
  const tConsent = useTranslations("parent.form.steps.consent");

  const values = toStepValues(application);
  const [stepIndex, setStepIndex] = useState(() =>
    initialStep(steps, values, application.status),
  );
  const [saveState, setSaveState] = useState(initialSaveDraftState);
  const [pending, startTransition] = useTransition();

  // Submit goes through useActionState, NOT through startTransition like the
  // per-step saves do. The submit action ends in redirect(), which works by
  // THROWING NEXT_REDIRECT — awaiting the action imperatively turns that into a
  // rejected promise that startTransition swallows, so the application saved
  // and the parent sat on the form wondering whether it had worked. Handing the
  // action to the form lets Next's own runtime see the redirect and navigate.
  const [submitState, submitAction, submitting] = useActionState(
    submitApplicationAction,
    initialSubmitState,
  );
  const alertRef = useRef<HTMLDivElement>(null);

  const isLast = stepIndex === steps.length - 1;
  const { Component } = steps[stepIndex];
  const failed =
    saveState.status === "invalid" ||
    submitState.status === "invalid" ||
    submitState.status === "blocked" ||
    submitState.status === "rate_limited";

  // The step advances HERE, after the save resolves — not in an effect watching
  // the result, which would be a cascading render. It also means we only ever
  // advance on a successful save: a rejected step keeps the parent in place
  // instead of carrying an invalid answer forward to fail again at submit.
  const handleSaveStep = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveApplicationDraft(saveState, formData);
      setSaveState(result);
      if (result.status === "saved") {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
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
    if (code === "captcha") {
      return tErrors("captcha");
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
    <form
      action={isLast ? submitAction : handleSaveStep}
      className="flex flex-col gap-6"
    >
      <input type="hidden" name="applicationId" value={application.id} />

      <p className="text-muted-foreground text-sm">
        {t("stepOf", { current: stepIndex + 1, total: steps.length })}
      </p>

      {failed ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {/* Name the actual problem. "Check the highlighted fields" is
              actively misleading when nothing is highlighted — as with a failed
              captcha, which isn't a field the parent can fix by re-reading it. */}
          {submitState.status === "rate_limited"
            ? tErrors("rate_limited")
            : submitState.blockReason
              ? tBlocked(submitState.blockReason)
              : submitState.errors.turnstileToken
                ? tErrors("captcha")
                : t("saveError")}
        </div>
      ) : null}

      <Component
        values={values}
        errors={errors}
        contact={contact}
        giftPriceCap={giftPriceCap}
        applicationId={application.id}
        files={files}
        turnstileSiteKey={turnstileSiteKey}
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

        {/* Two different pending signals now: useTransition for the per-step
            saves, useActionState for the submit. Using only the first would
            leave the submit button live while the application is being sent. */}
        <Button type="submit" disabled={isLast ? submitting : pending}>
          {isLast
            ? submitting
              ? tConsent("submitting")
              : tConsent("submit")
            : t("next")}
        </Button>
      </div>
    </form>
  );
}
