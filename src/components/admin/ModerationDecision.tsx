"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { decideApplicationAction } from "@/app/admin/applications/actions";
import { initialModerationState } from "@/features/applications/moderationState";

// Approve / reject. Two submit buttons in ONE form, each carrying its own
// name+value — the browser only sends the button that was clicked, so the
// decision needs no client state and the form works without JS.
//
// The note field is always visible rather than revealed by a click: a reject
// reason is the parent's only explanation, and hiding the field behind an
// interaction is how it ends up written in a hurry.
export function ModerationDecision({
  applicationId,
}: {
  applicationId: string;
}) {
  const t = useTranslations("admin.applications.decision");
  const tErrors = useTranslations("admin.applications.errors");
  const [state, formAction, pending] = useActionState(
    decideApplicationAction,
    initialModerationState,
  );

  const error =
    state.status === "invalid" ||
    state.status === "note_required" ||
    state.status === "already_decided"
      ? tErrors(state.status)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-muted-foreground text-sm">{t("intro")}</p>

      <input type="hidden" name="applicationId" value={applicationId} />

      <div className="flex flex-col gap-1">
        <label htmlFor="rejectionNote" className="text-sm font-medium">
          {t("noteLabel")}
        </label>
        <textarea
          id="rejectionNote"
          name="rejectionNote"
          rows={3}
          aria-describedby="rejectionNote-hint"
          aria-invalid={state.status === "note_required" || undefined}
          className="border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 aria-invalid:border-red-600"
        />
        <p id="rejectionNote-hint" className="text-muted-foreground text-xs">
          {t("noteHint")}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {state.status === "done" ? (
        <p role="status" className="text-sm font-medium">
          {t("decided")}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="decision"
          value="approved"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? t("working") : t("approve")}
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          disabled={pending}
          className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? t("working") : t("reject")}
        </button>
      </div>
    </form>
  );
}
