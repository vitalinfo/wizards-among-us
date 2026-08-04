"use client";

import { useTranslations } from "next-intl";

import { StarRating } from "./StarRating";

const REVIEWS = [
  { key: "one", rating: 5 },
  { key: "two", rating: 5 },
  { key: "three", rating: 4 },
] as const;

export function Reviews() {
  const t = useTranslations("landing.reviews");

  return (
    <section
      id="reviews"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {REVIEWS.map((review) => (
          <figure
            key={review.key}
            className="border-border flex flex-col gap-3 rounded-lg border p-5.5"
          >
            <StarRating rating={review.rating} />
            <blockquote className="text-body text-[15px] leading-relaxed">
              {t(`items.${review.key}.body`)}
            </blockquote>
            <figcaption className="text-muted-foreground text-sm">
              {t(`items.${review.key}.author`)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
