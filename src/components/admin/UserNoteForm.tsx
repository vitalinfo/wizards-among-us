"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { saveUserNoteAction } from "@/app/admin/users/actions";
import {
  initialUserNoteState,
  MAX_USER_NOTE_LENGTH,
} from "@/features/users/noteState";

// One note per person, edited in place.
//
// Always a textarea rather than a "add note" button that reveals one: an admin
// opens this list BECAUSE they have something to write down, and a click that
// only reveals a field is a click that does nothing.
export function UserNoteForm({
  userId,
  note,
}: {
  userId: string;
  note: string | null;
}) {
  const t = useTranslations("admin.users.note");
  const action = saveUserNoteAction.bind(null, userId);
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
        : state.status === "saved"
          ? t("saved")
          : null;

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium">
        {t("label")}
      </label>
      <textarea
        id={fieldId}
        name="note"
        rows={2}
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
        {message ? (
          <p
            id={messageId}
            // Announced when it appears — the button doesn't move or change, so
            // a saved note is otherwise silent for a screen-reader user.
            role="status"
            className={
              state.status === "saved"
                ? "text-muted-foreground text-xs"
                : "text-xs text-red-700"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
