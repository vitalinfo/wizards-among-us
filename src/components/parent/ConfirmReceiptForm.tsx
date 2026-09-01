"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { confirmReceiptAction } from "@/app/parent/applications/actions";
import { UploadField, type UploadedFile } from "@/components/forms/UploadField";

// Closing the loop: a photo of the child with their gift, then the button that
// marks the wish fulfilled.
//
// The photo is REQUIRED (Vital, Phase 7), so the button stays disabled until one
// exists — the server re-checks anyway (getConfirmBlockReason), this just avoids
// a click that can only fail.
// useFormStatus reads the enclosing form, so it has to be its own component.
function SubmitButton({ disabled }: { disabled: boolean }) {
  const t = useTranslations("parent.confirm");
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring w-full rounded-md px-4 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function ConfirmReceiptForm({
  applicationId,
  photo,
  blocked,
}: {
  applicationId: string;
  photo: UploadedFile | null;
  // A refusal echoed back by the server, if the client-side guard was bypassed.
  blocked: string | null;
}) {
  const t = useTranslations("parent.confirm");

  return (
    <div className="flex flex-col gap-5">
      <UploadField
        applicationId={applicationId}
        kind="confirmation"
        label={t("photo.label")}
        existing={photo ?? undefined}
        required
      />

      {blocked ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {t(`blocked.${blocked}`)}
        </p>
      ) : null}

      {/* A BOUND server action, not a client closure: a closure would make the
          button depend on hydration, and a dead confirm button is how a family
          gets stuck unable to close the loop. Without JS this posts normally;
          the server re-checks the photo either way. */}
      <form action={confirmReceiptAction.bind(null, applicationId)}>
        <SubmitButton disabled={photo === null} />
      </form>
      {photo === null ? (
        <p className="text-muted-foreground text-center text-xs">
          {t("photoFirst")}
        </p>
      ) : null}
    </div>
  );
}
