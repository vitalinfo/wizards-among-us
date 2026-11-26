import { type PageSize, parsePageSize } from "@/lib/pageSize";

// The url grammar for the public «Відгуки» page: the page and the page size.
//
// 5 by default, the design's figure (186:904): each review is a 570px card,
// and ten of them is a very long scroll before the pager.
export const REVIEWS_PAGE_SIZE: PageSize = 5;

export type PublicReviewsQuery = { page: number; per: PageSize };

export function parsePublicReviewsQuery(params: {
  page?: string;
  per?: string;
}): PublicReviewsQuery {
  const page = Number(params.page);
  return {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    per: parsePageSize(params.per, REVIEWS_PAGE_SIZE),
  };
}

export function publicReviewsHref(query: Partial<PublicReviewsQuery> = {}) {
  const params = new URLSearchParams();
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.per && query.per !== REVIEWS_PAGE_SIZE) {
    params.set("per", String(query.per));
  }
  const qs = params.toString();
  return `/reviews${qs ? `?${qs}` : ""}`;
}
