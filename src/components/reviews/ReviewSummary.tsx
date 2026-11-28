import { useFormatter, useTranslations } from "next-intl";

import { ReviewStars } from "./ReviewStars";

// One family's review on an application page — the volunteer's claim card and
// the admin's application page: the text, then the stars and the date on one
// row. The heading is the page's, so each draws it in its own style.
export function ReviewSummary({
  review,
}: {
  review: { rating: number; body: string | null; createdAt: Date };
}) {
  const t = useTranslations("reviews.list");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-4">
      {/* pre-line: a parent who wrote two paragraphs sees two. */}
      {review.body ? (
        <p className="text-sm tracking-[-0.03em] whitespace-pre-line">
          {review.body}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <ReviewStars
          rating={review.rating}
          label={t("rating", { rating: review.rating })}
        />
        <time
          dateTime={review.createdAt.toISOString()}
          className="text-muted-foreground text-sm"
        >
          {format.dateTime(review.createdAt, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </time>
      </div>
    </div>
  );
}
