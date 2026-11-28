// The moderation list's filters, carried in the url (?status=, ?gallery=), so
// a filtered list is a shareable link and the filter form needs no client
// JavaScript.
//
// Status: whether a review is on the public «Відгуки» page.
export const REVIEW_STATUS_FILTERS = ["all", "published", "hidden"] as const;
export type ReviewStatusFilter = (typeof REVIEW_STATUS_FILTERS)[number];

// Gallery: what an admin curating the gallery needs to find — the photos that
// are in it, and the ones that could be (consent and a photo, not yet in).
// "Not in the gallery" on its own would be mostly families who never
// consented, which is a list nobody can act on.
export const REVIEW_GALLERY_FILTERS = ["all", "in", "eligible"] as const;
export type ReviewGalleryFilter = (typeof REVIEW_GALLERY_FILTERS)[number];

export type ReviewListFilter = {
  status: ReviewStatusFilter;
  gallery: ReviewGalleryFilter;
};

export const ALL_REVIEWS: ReviewListFilter = { status: "all", gallery: "all" };

// Anything unrecognised — a typo, a stale link — reads as «all» rather than
// as an empty list that looks like there are no reviews.
export function parseReviewStatusFilter(value: unknown): ReviewStatusFilter {
  return REVIEW_STATUS_FILTERS.find((status) => status === value) ?? "all";
}

export function parseReviewGalleryFilter(value: unknown): ReviewGalleryFilter {
  return REVIEW_GALLERY_FILTERS.find((gallery) => gallery === value) ?? "all";
}

// Takes `unknown` because it also re-parses what the actions get bound from
// the client.
export function parseReviewListFilter(value: unknown): ReviewListFilter {
  const raw =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  return {
    status: parseReviewStatusFilter(raw.status),
    gallery: parseReviewGalleryFilter(raw.gallery),
  };
}

export function isNarrowed(filter: ReviewListFilter): boolean {
  return filter.status !== "all" || filter.gallery !== "all";
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
export function reviewsHref(filter: ReviewListFilter, page = 1): string {
  const params = new URLSearchParams();
  if (filter.status !== "all") {
    params.set("status", filter.status);
  }
  if (filter.gallery !== "all") {
    params.set("gallery", filter.gallery);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const search = params.toString();
  return search === "" ? "/admin/reviews" : `/admin/reviews?${search}`;
}
