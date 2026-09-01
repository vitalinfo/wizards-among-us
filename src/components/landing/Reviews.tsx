"use client";

import { useTranslations } from "next-intl";

import type { PublishedReview } from "@/features/reviews/queries";

import { StarRating } from "./StarRating";

// Real, admin-published reviews from families whose wish was fulfilled.
//
// This used to render three hardcoded testimonials. They were placeholder copy,
// but on a public page they read as real people vouching for the project — so
// they are gone rather than kept as a fallback. If nothing is published yet the
// section does not render at all: an empty shelf is honest, invented praise is
// not.
//
// Byline is the FIRST NAME only (Vital, Phase 7) — enough to read as a person,
// not enough to tie a review to one family alongside a story and an oblast.
export function Reviews({ reviews }: { reviews: PublishedReview[] }) {
  const t = useTranslations("landing.reviews");

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section
      id="reviews"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {reviews.map((review) => (
          <figure
            key={review.id}
            className="border-border flex flex-col gap-3 rounded-lg border p-5.5"
          >
            <StarRating rating={review.rating} />
            {review.body ? (
              <blockquote className="text-body text-[15px] leading-relaxed">
                {review.body}
              </blockquote>
            ) : null}
            <figcaption className="text-muted-foreground text-sm">
              {review.authorFirstName ?? t("anonymous")}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
