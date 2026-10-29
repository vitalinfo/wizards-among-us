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
} from "@/app/account/(shell)/parent/applications/[applicationId]/actions";
import type { ContactMethod } from "@/db/enums";
import {
  initialSaveDraftState,
  initialSubmitState,
} from "@/features/applications/formState";

import type { FileKind } from "@/db/enums";
import { cn } from "@/lib/utils";

import { FormStepper } from "./FormStepper";
import { initialStep, type FormStep } from "./steps";
import { toStepValues, type ApplicationRow, type StepValues } from "./types";

// The multistep application form (Figma 147:7166), mirroring the sections
// parents already know from the paper/Google form: «Анкета дитини» over a
// five-step stepper, the step's own one-line intro, the step, and «Далі».
//
// Every step is a real <form> posting to a server action, so each one SAVES A
// DRAFT before the next appears — a parent can close the tab on a phone and
// come back. Only the last step submits.
export function ApplicationForm({
  application,
  contact,
  defaultParentName,
  giftPriceCap,
  files,
  turnstileSiteKey,
  steps,
}: {
  application: ApplicationRow;
  contact: { method: ContactMethod; value: string } | null;
  defaultParentName: string | null;
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
  const tUploads = useTranslations("parent.form.upload");
  const tSteps = useTranslations("parent.form.steps");

  const saved = toStepValues(application);

  // React 19 resets an uncontrolled form as soon as its action finishes. When
  // the step is REJECTED we stay on it — and the reset had just emptied every
  // field, so a single bad link cost the parent the whole step. (On a
  // successful step it's invisible: the next step's fields render blank
  // anyway.)
  //
  // A reset restores each control to its defaultValue, so the fix is to hand
  // back what was posted as the new defaults. Kept client-side rather than
  // round-tripped through the action: it must survive every rejection —
  // invalid, missing_files, rate_limited, blocked — not just the ones that
  // bother to echo the values.
  const [posted, setPosted] = useState<StepValues>({});
  const values = { ...saved, ...posted };

  const [stepIndex, setStepIndex] = useState(() =>
    initialStep(
      steps,
      values,
      application.status,
      Object.values(files).map((file) => file.kind as FileKind),
    ),
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

  // The submit validates the WHOLE application, so a field from an earlier step
  // can fail it — and on the consent step that field isn't on screen, leaving
  // «Перевірте виділені поля» with nothing highlighted. Take the parent to the
  // step that holds it. Adjusted during render, when a new result arrives,
  // rather than in an effect (which would render the wrong step first).
  // `shownSubmit` is the result still on screen: a successful step save clears
  // it, so a fixed error doesn't follow the parent forward.
  const [seenSubmit, setSeenSubmit] = useState(submitState);
  const [shownSubmit, setShownSubmit] = useState(submitState);
  if (submitState !== seenSubmit) {
    setSeenSubmit(submitState);
    setShownSubmit(submitState);
    const errorStep = steps.findIndex((step) =>
      step.fields.some((field) => field in submitState.errors),
    );
    if (errorStep !== -1) {
      setStepIndex(errorStep);
    }
  }

  const isLast = stepIndex === steps.length - 1;
  const { Component } = steps[stepIndex];
  const failed =
    saveState.status === "invalid" ||
    saveState.status === "missing_files" ||
    shownSubmit.status === "invalid" ||
    shownSubmit.status === "blocked" ||
    shownSubmit.status === "rate_limited";

  // The step advances HERE, after the save resolves — not in an effect watching
  // the result, which would be a cascading render. It also means we only ever
  // advance on a successful save: a rejected step keeps the parent in place
  // instead of carrying an invalid answer forward to fail again at submit.
  const handleSaveStep = (formData: FormData) => {
    startTransition(async () => {
      const result = await saveApplicationDraft(saveState, formData);
      setSaveState(result);
      if (result.status === "saved") {
        // The server now holds these, so the snapshot would only shadow the
        // fresh values with identical stale ones.
        setPosted({});
        setShownSubmit(initialSubmitState);
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }
    });
  };

  // Runs for both paths — the per-step save and the final submit, which goes
  // through useActionState and never hands us its FormData. Files are dropped:
  // uploads post themselves (UploadField) and a File is not a default value.
  const rememberPosted = (form: HTMLFormElement) => {
    const entries: StepValues = {};
    for (const [key, value] of new FormData(form).entries()) {
      if (
        typeof value === "string" &&
        key !== "applicationId" &&
        key !== "step"
      ) {
        entries[key] = value;
      }
    }
    setPosted(entries);
  };

  // Move focus to the message so a keyboard or screen-reader user isn't
  // stranded at the bottom of the form wondering why nothing happened.
  useEffect(() => {
    if (failed) {
      alertRef.current?.focus();
    }
  }, [failed, saveState, shownSubmit]);

  // zod issue codes → Ukrainian copy. Mapped here, so no user-facing strings
  // are produced on the server.
  const messageFor = (code: string | undefined) => {
    if (!code) {
      return undefined;
    }
    if (code === "invalid_url") {
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
    Object.entries({ ...saveState.errors, ...shownSubmit.errors }).map(
      ([field, code]) => [field, messageFor(code)],
    ),
  );

  return (
    <form
      action={isLast ? submitAction : handleSaveStep}
      onSubmit={(event) => rememberPosted(event.currentTarget)}
      className="mx-auto flex w-full max-w-[1022px] flex-col"
    >
      <input type="hidden" name="applicationId" value={application.id} />
      {/* Which step is being saved. The save action needs it to know which
          uploads this step will not advance without — without it the check
          silently matched no step and let everything through. */}
      <input type="hidden" name="step" value={steps[stepIndex].key} />

      <h1 className="font-display text-center text-[46px] leading-[44px] font-bold tracking-[-0.06em] lg:text-[74px] lg:leading-[60px]">
        {t.rich("pageTitle", {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
        })}
      </h1>

      <div className="mt-6 lg:mt-11">
        <FormStepper
          label={t("stepsLabel")}
          current={stepIndex}
          steps={steps.map((step) => tSteps(`${step.key}.title`))}
        />
      </div>

      <p className="text-muted-foreground mx-auto mt-6 max-w-[537px] text-center text-sm leading-5 font-medium tracking-[-0.03em] lg:mt-11 lg:text-base">
        {tSteps(`${steps[stepIndex].key}.intro`)}
      </p>

      {failed ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="border-danger/30 bg-status-draft-tint text-status-draft mt-6 rounded-lg border p-3 text-sm"
        >
          {/* Name the actual problem. "Check the highlighted fields" is
              actively misleading when nothing is highlighted — as with a failed
              captcha, which isn't a field the parent can fix by re-reading it. */}
          {saveState.status === "missing_files"
            ? tUploads("missingForStep", {
                files: (saveState.missingUploads ?? [])
                  .map((kind) => tUploads(`kinds.${kind}`))
                  .join(", "),
              })
            : shownSubmit.status === "rate_limited"
              ? tErrors("rate_limited")
              : shownSubmit.blockReason
                ? tBlocked(shownSubmit.blockReason)
                : shownSubmit.errors.turnstileToken
                  ? tErrors("captcha")
                  : t("saveError")}
        </div>
      ) : null}

      <div className="mt-6 lg:mt-[31px]">
        <Component
          values={values}
          errors={errors}
          contact={contact}
          defaultParentName={defaultParentName}
          giftPriceCap={giftPriceCap}
          applicationId={application.id}
          files={files}
          turnstileSiteKey={turnstileSiteKey}
        />
      </div>

      {/* «Назад» on the left, «Далі» on the right (Vital). «Назад» is a
          plain button, so Enter still submits «Далі». */}
      <div className="mt-8 flex flex-wrap items-center gap-2 lg:mt-[34px]">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => {
              setPosted({});
              setStepIndex((current) => current - 1);
            }}
            className={cn(
              PILL,
              "text-muted-foreground bg-surface-idle hover:text-foreground",
            )}
          >
            {t("back")}
          </button>
        ) : null}

        {/* Two different pending signals now: useTransition for the per-step
            saves, useActionState for the submit. Using only the first would
            leave the submit button live while the application is being sent. */}
        <button
          type="submit"
          disabled={isLast ? submitting : pending}
          className={cn(
            PILL,
            "bg-primary text-primary-foreground hover:bg-primary-hover",
          )}
        >
          {isLast
            ? submitting
              ? tConsent("submitting")
              : // Already sent: the button saves an edit, it does not submit
                // again. «Подати заявку» would suggest the first one never
                // arrived.
                tConsent(
                  application.status === "submitted" ? "resubmit" : "submit",
                )
            : t("next")}
        </button>
      </div>
    </form>
  );
}

// 64 tall at both widths with 44 either side, as the design draws «Далі»
// (132 wide on its label) and «Назад».
const PILL =
  "focus-visible:outline-ring inline-flex h-16 min-w-[132px] items-center justify-center rounded-full px-11 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60";
