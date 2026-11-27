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

// The same 50 as the other admin lists (Vital).
export const REVIEWS_PAGE_SIZE = 50;

// Anything unparseable is page 1 rather than an error — a bad page number
// must never be able to blank the list. Past the last page is clamped by the
// page once it knows the total.
export function parseReviewsPage(value: unknown): number {
  // A repeated ?page= arrives as an array; Number(["2"]) is 2, which is luck,
  // not parsing.
  if (typeof value !== "string" && typeof value !== "number") {
    return 1;
  }
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function reviewsPageCount(total: number): number {
  // Always at least one page, so an empty result still renders coherently.
  return Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));
}

// Omits what is default, so the plain url stays clean and older links keep
// working.
export function reviewsHref(status: ReviewStatusFilter, page = 1): string {
  const params = new URLSearchParams();
  if (status !== "all") {
    params.set("status", status);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search === "" ? "/admin/reviews" : `/admin/reviews?${search}`;
}
