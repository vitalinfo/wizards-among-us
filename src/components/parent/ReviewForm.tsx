"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { submitReviewAction } from "@/app/parent/review/actions";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { initialReviewActionState } from "@/features/reviews/formState";

const RATINGS = [5, 4, 3, 2, 1] as const;

// A thank-you: the rating is required, the words are not. Radio buttons rather
// than a star widget — native inputs are keyboard- and screen-reader-operable
// for free, and a five-item radio group is exactly what this is.
export function ReviewForm({ applicationId }: { applicationId: string }) {
  const t = useTranslations("parent.review");
  const [state, formAction, pending] = useActionState(
    submitReviewAction.bind(null, applicationId),
    initialReviewActionState,
  );

  const error =
    state.status === "invalid"
      ? t("errors.invalid")
      : state.status === "blocked"
        ? t(`errors.${state.reason ?? "not_owner"}`)
        : null;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t("ratingLegend")}</legend>
        <div className="mt-1 flex flex-col gap-2">
          {RATINGS.map((rating) => (
            <label key={rating} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="rating"
                value={rating}
                required
                className="accent-primary size-4"
              />
              {/* Text, not only stars — a rating conveyed by icon alone is
                  invisible to a screen reader. */}
              <span>{t(`ratings.${rating}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextAreaField
        id="body"
        name="body"
        rows={4}
        label={t("bodyLabel")}
        hint={t("bodyHint")}
      />

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring w-fit rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
      <p className="text-muted-foreground text-xs">{t("moderationNote")}</p>
    </form>
  );
}
