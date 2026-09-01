"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { saveVolunteerPhoneAction } from "@/app/volunteer/actions";
import { TextField } from "@/components/forms/TextField";
import { initialVolunteerActionState } from "@/features/claims/formState";

// Collects the fallback contact for a volunteer with no Telegram @username.
// Stored on `users`, never copied onto a claim — one contact per person, kept
// fresh (the Phase 4 decision).
export function VolunteerPhoneForm({ next }: { next: string }) {
  const t = useTranslations("volunteer.contact");
  const [state, formAction, pending] = useActionState(
    saveVolunteerPhoneAction,
    initialVolunteerActionState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <TextField
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        label={t("phoneLabel")}
        hint={t("phoneHint")}
        error={state.status === "invalid" ? t("phoneError") : undefined}
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring w-fit rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {t("save")}
      </button>
    </form>
  );
}
