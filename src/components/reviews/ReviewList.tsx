import { useTranslations } from "next-intl";

import type { PublicReview } from "@/features/reviews/mappers";

import { ReviewCard } from "./ReviewCard";

// The page's reviews, in the hour's order. The photo zig-zags right, left, right —
// counted over the reviews that HAVE a photo, so a text-only card between two
// photo cards doesn't leave both photos on the same side.
export function ReviewList({ reviews }: { reviews: PublicReview[] }) {
  const t = useTranslations("reviews.list");

  if (reviews.length === 0) {
    return (
      <p className="text-muted-foreground text-center text-base leading-5 tracking-[-0.03em] lg:text-lg">
        {t("empty")}
      </p>
    );
  }

  let photos = 0;
  return (
    <ul aria-label={t("label")} className="flex flex-col gap-6">
      {reviews.map((review) => {
        const side =
          review.photoVersion !== null && photos++ % 2 === 1 ? "start" : "end";
        return (
          <li key={review.id}>
            <ReviewCard review={review} photoSide={side} />
          </li>
        );
      })}
    </ul>
  );
}
