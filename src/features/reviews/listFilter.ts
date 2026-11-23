// The moderation list's one filter: whether a review is on the landing page.
// Carried in the url (?status=), so a filtered list is a shareable link and
// the filter form needs no client JavaScript.
export const REVIEW_STATUS_FILTERS = ["all", "published", "hidden"] as const;
export type ReviewStatusFilter = (typeof REVIEW_STATUS_FILTERS)[number];

// Anything unrecognised — a typo, a stale link — reads as «all» rather than
// as an empty list that looks like there are no reviews.
export function parseReviewStatusFilter(value: unknown): ReviewStatusFilter {
  return REVIEW_STATUS_FILTERS.find((status) => status === value) ?? "all";
}

export function reviewsHref(status: ReviewStatusFilter): string {
  return status === "all"
    ? "/admin/reviews"
    : `/admin/reviews?status=${status}`;
}
