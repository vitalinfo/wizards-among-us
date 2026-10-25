"use client";

import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";

import { confirmReceiptAction } from "@/app/account/(shell)/parent/applications/actions";
import { UploadField, type UploadedFile } from "@/components/forms/UploadField";
import type { ApplicationsQuery } from "@/features/applications/applicationTabs";

// Closing the loop (Figma 142:5726): a photo of the child with their gift,
// then the button that marks the wish fulfilled. Drawn inside the
// «Підтвердіть, що подарунок отримано» dialog over «Мої заявки».
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
      className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring h-16 w-full rounded-full px-[18px] text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 lg:h-[51px]"
    >
      {pending ? t("submitting") : t("submit")}
    </button>
  );
}

export function ConfirmReceiptForm({
  applicationId,
  view,
  photo,
  blocked,
}: {
  applicationId: string;
  // The list's tab, page and size, so the review that follows opens over the same
  // view.
  view: ApplicationsQuery;
  photo: UploadedFile | null;
  // A refusal echoed back by the server, if the client-side guard was bypassed.
  blocked: string | null;
}) {
  const t = useTranslations("parent.confirm");

  return (
    <div className="flex flex-col">
      <UploadField
        applicationId={applicationId}
        kind="confirmation"
        label={t("photo.label")}
        existing={photo ?? undefined}
        required
        variant="dropzone"
      />

      {blocked ? (
        <p role="alert" className="text-danger mt-2 text-sm font-medium">
          {t(`blocked.${blocked}`)}
        </p>
      ) : null}

      {/* A BOUND server action, not a client closure: a closure would make the
          button depend on hydration, and a dead confirm button is how a family
          gets stuck unable to close the loop. Without JS this posts normally;
          the server re-checks the photo either way. */}
      <form
        action={confirmReceiptAction.bind(null, applicationId, view)}
        className="mt-[34px] lg:mt-[22px]"
      >
        <SubmitButton disabled={photo === null} />
      </form>
      {photo === null ? (
        <p className="mt-[26px] text-sm tracking-[-0.06em]">
          {t("photoFirst")}
        </p>
      ) : null}
    </div>
  );
}
