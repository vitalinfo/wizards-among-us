"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { ALLOWED_UPLOAD_TYPES } from "@/features/applications/files";

export type UploadedFile = { id: string; kind: string; contentType: string };

// One upload slot. Sends the file as soon as it's chosen — same instinct as the
// per-step drafts: a parent on a phone shouldn't lose a photo because they
// closed the tab before pressing a later button.
//
// The server is the authority on what's acceptable; this only pre-filters the
// picker (`accept`) and turns the server's rejection CODE into Ukrainian copy.
export function UploadField({
  applicationId,
  kind,
  label,
  hint,
  existing,
  required,
}: {
  applicationId: string;
  kind: string;
  label: string;
  hint?: string;
  existing?: UploadedFile;
  required?: boolean;
}) {
  const t = useTranslations("parent.form.upload");
  const tErrors = useTranslations("parent.form.upload.errors");
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = `/api/applications/${applicationId}/files`;

  // Only codes we have copy for. An unexpected code would otherwise make
  // next-intl throw inside the error path — turning a failed upload into a
  // crashed page.
  const KNOWN_ERRORS = [
    "unsupported_type",
    "too_large",
    "missing_file",
    "unknown_kind",
    "not_editable",
    "failed",
  ];
  const errorMessage = error
    ? tErrors(KNOWN_ERRORS.includes(error) ? error : "failed")
    : null;

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch(base, { method: "POST", body });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "failed");
        return;
      }
      router.refresh();
    } catch {
      // Network failure — distinct from a rejection, same advice to the user.
      setError("failed");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        // Clear the picker so choosing the SAME file again still fires change.
        inputRef.current.value = "";
      }
    }
  };

  const remove = async () => {
    if (!existing) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${base}/${existing.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setError("failed");
        return;
      }
      router.refresh();
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  };

  const describedBy =
    [hint ? `${inputId}-hint` : null, error ? `${inputId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-muted-foreground ml-0.5">
            *
          </span>
        ) : null}
      </label>
      {hint ? (
        <p id={`${inputId}-hint`} className="text-muted-foreground text-xs">
          {hint} {t("hint")}
        </p>
      ) : null}

      {existing ? (
        <div className="border-border bg-surface-muted flex flex-wrap items-center gap-3 rounded-md border p-3">
          <span className="text-sm font-medium">{t("uploaded")}</span>
          <a
            href={`${base}/${existing.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline underline-offset-4"
          >
            {t("view")}
          </a>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
          >
            {t("remove")}
          </button>
        </div>
      ) : null}

      {/* The native control renders its own text ("Choose File / No file
          chosen") in the BROWSER's language, which would show English to a
          Ukrainian user. So the input is visually hidden — still focusable and
          still the labelled control — and the visible affordance is a styled
          <label>, which natively opens the picker and is keyboard-operable. */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_UPLOAD_TYPES.join(",")}
        disabled={busy}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void upload(file);
          }
        }}
        className="sr-only"
      />
      <label
        htmlFor={inputId}
        className="border-border bg-surface hover:bg-surface-muted focus-within:outline-ring inline-flex w-fit cursor-pointer items-center rounded-md border px-4 py-2 text-sm font-medium"
      >
        {existing ? t("replace") : t("choose")}
      </label>

      {busy ? (
        <p role="status" className="text-muted-foreground text-sm">
          {t("uploading")}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-sm text-red-700"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
