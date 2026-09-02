"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { saveUserNoteAction } from "@/app/admin/users/actions";
import {
  initialUserNoteState,
  MAX_USER_NOTE_LENGTH,
} from "@/features/users/noteState";

// One note per person, on that person's own page.
//
// The action ends in redirect() on success, so this only ever renders the
// FAILURE states — a note too long, or a person deleted between opening the
// page and pressing save.
export function UserNoteForm({
  userId,
  note,
  returnTo,
  cancelLabel,
}: {
  userId: string;
  note: string | null;
  // Where saving goes. Bound here rather than posted in the form, so it cannot
  // be turned into an open redirect.
  returnTo: string;
  cancelLabel: string;
}) {
  const t = useTranslations("admin.users.note");
  const action = saveUserNoteAction.bind(null, userId, returnTo);
  const [state, formAction, pending] = useActionState(
    action,
    initialUserNoteState,
  );

  const fieldId = `note-${userId}`;
  const messageId = `${fieldId}-message`;
  const message =
    state.status === "too_long"
      ? t("tooLong", { max: MAX_USER_NOTE_LENGTH })
      : state.status === "not_found"
        ? t("notFound")
        : null;

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium">
        {t("label")}
      </label>
      <textarea
        id={fieldId}
        name="note"
        rows={6}
        defaultValue={note ?? ""}
        maxLength={MAX_USER_NOTE_LENGTH}
        aria-invalid={state.status === "too_long" || undefined}
        aria-describedby={message ? messageId : undefined}
        className="border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        <Link
          href={returnTo}
          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
        >
          {cancelLabel}
        </Link>
        {message ? (
          <p
            id={messageId}
            // Announced when it appears: nothing else on the page moves, so a
            // refused save is otherwise silent for a screen-reader user.
            role="alert"
            className="text-xs text-red-700"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
