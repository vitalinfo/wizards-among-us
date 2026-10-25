"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { submitReviewAction } from "@/app/account/(shell)/parent/review/actions";
import { TextAreaField } from "@/components/forms/TextAreaField";
import type { ApplicationsQuery } from "@/features/applications/applicationTabs";
import { initialReviewActionState } from "@/features/reviews/formState";

const RATINGS = [5, 4, 3, 2, 1] as const;

// A thank-you (Figma 142:5726), in the «Залишити відгук» dialog that follows
// confirming the gift: the rating is required, the words are not. Radio buttons
// rather than a star widget — native inputs are keyboard- and
// screen-reader-operable for free, and a five-item radio group is exactly what
// this is.
export function ReviewForm({
  applicationId,
  view,
}: {
  applicationId: string;
  // The list's tab and page, to land back on after sending.
  view: ApplicationsQuery;
}) {
  const t = useTranslations("parent.review");
  const [state, formAction, pending] = useActionState(
    submitReviewAction.bind(null, applicationId, view),
    initialReviewActionState,
  );

  const error =
    state.status === "invalid"
      ? t("errors.invalid")
      : state.status === "blocked"
        ? t(`errors.${state.reason ?? "not_owner"}`)
        : null;

  return (
    <form action={formAction} className="flex flex-col">
      {error ? (
        <p role="alert" className="text-danger mb-2 text-sm font-medium">
          {error}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2 py-3">
        <legend className="mb-2 text-base tracking-[-0.06em]">
          {t("ratingLegend")}
        </legend>
        {RATINGS.map((rating) => (
          <label
            key={rating}
            className="flex w-fit cursor-pointer items-center gap-3.5 text-sm tracking-[-0.06em]"
          >
            {/* The design's empty circle, at 60% of the foreground rather
                than its 44%: a control's outline needs 3:1 (WCAG 1.4.11),
                which 44% (2.3:1) is not and 60% (3.4:1) is. Checked, it
                fills with the primary blue. */}
            <input
              type="radio"
              name="rating"
              value={rating}
              required
              className="border-foreground/60 checked:border-primary focus-visible:outline-ring m-[3px] size-[18px] shrink-0 cursor-pointer appearance-none rounded-full border-2 transition-colors checked:border-[6px] focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            {/* Text, not only a mark — a rating conveyed by icon alone is
                invisible to a screen reader. */}
            <span>{t(`ratings.${rating}`)}</span>
          </label>
        ))}
      </fieldset>

      {/* The privacy note is the placeholder, as drawn, and a placeholder is
          announced as the field's description when it has no other. */}
      <div className="py-3">
        <TextAreaField
          id="body"
          name="body"
          rows={3}
          label={t("bodyLabel")}
          placeholder={t("bodyHint")}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring mt-[31px] h-16 w-full rounded-full px-[18px] text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 lg:mt-3 lg:h-[51px]"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
