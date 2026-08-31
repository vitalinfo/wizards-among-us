"use client";

import { useTranslations } from "next-intl";
import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

// A button that asks before it acts.
//
// Owns its own <form>, so a caller replaces `<form action={x}><button/></form>`
// with one element and gets the confirmation for free.
//
// Built on the native <dialog> element with showModal(): focus moves in, is
// trapped while open, Escape closes it, and focus returns to the trigger — all
// browser behaviour we'd otherwise have to hand-roll and get subtly wrong
// (accessibility rules: prefer native behaviour over custom keyboard handlers).

function ConfirmButton({ label }: { label: string }) {
  // useFormStatus reads the enclosing form, so this has to be its own component.
  const { pending } = useFormStatus();
  const t = useTranslations("common.confirm");
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
    >
      {pending ? t("working") : label}
    </button>
  );
}

export function ConfirmSubmitButton({
  action,
  label,
  title,
  message,
  confirmLabel,
  className,
}: {
  // A server action, already bound to its arguments by the caller.
  action: () => Promise<void>;
  label: string;
  title: string;
  // What actually happens, in plain words — this is the whole point of the
  // dialog, so it must say the consequence, not "are you sure?".
  message: string;
  confirmLabel: string;
  className?: string;
}) {
  const t = useTranslations("common.confirm");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <form action={action}>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={className}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="bg-surface text-foreground border-border m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border p-5 shadow-lg backdrop:bg-black/50"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        <p className="text-body mt-2 text-sm">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("cancel")}
          </button>
          <ConfirmButton label={confirmLabel} />
        </div>
      </dialog>
    </form>
  );
}
