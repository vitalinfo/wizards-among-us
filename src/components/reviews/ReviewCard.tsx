import { useFormatter, useTranslations } from "next-intl";

import {
  publicReviewPhotoHref,
  type PublicReview,
} from "@/features/reviews/mappers";
import { cn } from "@/lib/utils";

import { ReviewStars } from "./ReviewStars";

// One review (Figma 186:128 desktop, 186:550 phone): the card, and beside it —
// only when the family consented — their photo with the gift. Without a photo
// the card takes the whole row, as the design's 186:160 does.
//
// `photoSide` alternates down the list, the way the design zig-zags. The text
// stays FIRST in the markup either way and the photo moves with `order`, so a
// screen reader always meets the words before the picture.
export function ReviewCard({
  review,
  photoSide,
}: {
  review: PublicReview;
  photoSide: "start" | "end";
}) {
  const t = useTranslations("reviews.list");
  const format = useFormatter();
  const photo =
    review.photoVersion === null
      ? null
      : publicReviewPhotoHref({
          id: review.id,
          photoVersion: review.photoVersion,
        });

  return (
    <article
      className={cn(
        "grid gap-2 lg:gap-6",
        photo &&
          (photoSide === "start"
            ? "lg:grid-cols-[430fr_1018fr]"
            : "lg:grid-cols-[1018fr_430fr]"),
      )}
    >
      <div className="bg-surface flex flex-col justify-between gap-6 rounded-3xl border border-[#fbfbfb] p-6 shadow-[0_0_60px_0_rgba(170,170,170,0.1)] lg:min-h-[570px] lg:p-11">
        <div className="flex flex-col gap-3.5 lg:gap-6">
          {/* Decorative: the design's speech bubble, not information. */}
          <span
            aria-hidden="true"
            className="bg-primary flex size-11 items-center justify-center rounded-full text-2xl leading-none lg:size-15 lg:text-[32px]"
          >
            💭
          </span>
          <div className="text-muted-foreground flex flex-col gap-3.5 tracking-[-0.03em] lg:gap-4.5">
            <h2 className="text-xl leading-[30px] font-semibold lg:text-2xl">
              {review.authorFirstName ?? t("anonymous")}
            </h2>
            {/* pre-line: a parent who wrote two paragraphs sees two. */}
            {review.body ? (
              <p className="text-base leading-5 whitespace-pre-line lg:text-xl lg:leading-[26px]">
                {review.body}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ReviewStars
            rating={review.rating}
            label={t("rating", { rating: review.rating })}
          />
          <time
            dateTime={review.createdAt.toISOString()}
            className="text-muted-foreground text-sm leading-[22px] tracking-[-0.03em] lg:text-base"
          >
            {format.dateTime(review.createdAt, {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </time>
        </div>
      </div>

      {photo ? (
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden rounded-[20px] lg:aspect-auto lg:min-h-[574px] lg:rounded-3xl",
            photoSide === "start" && "order-first",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- served by the consent-gated review photo route, not an optimizable static asset */}
          <img
            src={photo}
            alt={t("photoAlt")}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      ) : null}
    </article>
  );
}
