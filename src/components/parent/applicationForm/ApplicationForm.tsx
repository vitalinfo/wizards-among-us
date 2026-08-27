"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";

import { saveApplicationDraft } from "@/app/parent/applications/[id]/actions";
import { initialSaveDraftState } from "@/features/applications/formState";
import { Button } from "@/components/ui/Button";

import { ChildStep } from "./ChildStep";
import type { ApplicationRow } from "./types";

// The multistep application form.
//
// Each step is its own <form> POSTing to the same server action, so a step
// saves as a draft before the next one appears — a parent can close the tab and
// come back. Progressive by design: the fields are real inputs in a real form,
// so this degrades to a working (if unstepped) form without JavaScript.
const STEPS = [{ key: "child", Component: ChildStep }] as const;

export function ApplicationForm({
  application,
}: {
  application: ApplicationRow;
}) {
  const t = useTranslations("parent.form");
  const tErrors = useTranslations("parent.form.errors");
  const [state, formAction, pending] = useActionState(
    saveApplicationDraft,
    initialSaveDraftState,
  );
  const errorSummary = useRef<HTMLDivElement>(null);

  // On a failed save, move focus to the summary so a keyboard or screen-reader
  // user isn't stranded at the bottom of the form wondering what happened.
  useEffect(() => {
    if (state.status === "invalid") {
      errorSummary.current?.focus();
    }
  }, [state]);

  // zod issue codes → Ukrainian copy. Mapping here (not on the server) keeps
  // user-facing strings in the locale file.
  const messageFor = (code: string | undefined) => {
    if (!code) {
      return undefined;
    }
    if (code === "invalid_string" || code === "invalid_format") {
      return tErrors("invalid_url");
    }
    if (code === "too_small" || code === "invalid_type") {
      return tErrors("required");
    }
    if (code === "too_big") {
      return tErrors("out_of_range");
    }
    return tErrors("invalid");
  };

  const errors = Object.fromEntries(
    Object.entries(state.errors).map(([field, code]) => [
      field,
      messageFor(code),
    ]),
  );

  const { Component } = STEPS[0];

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="applicationId" value={application.id} />

      <p className="text-muted-foreground text-sm">
        {t("stepOf", { current: 1, total: STEPS.length })}
      </p>

      {state.status === "invalid" ? (
        <div
          ref={errorSummary}
          tabIndex={-1}
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {t("saveError")}
        </div>
      ) : null}

      <Component
        values={
          application as unknown as Record<string, string | number | null>
        }
        errors={errors}
      />

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("next")}
        </Button>
        {state.status === "saved" ? (
          <span role="status" className="text-muted-foreground text-sm">
            {t("saved")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
