import type { ClaimTab } from "./queries";

// The url grammar for «Мої підопічні» — the tab and the page, so every view is
// addressable and the browser's back button returns to the one you were on.
// Same approach as the browse filters and the moderation queue.

export const CLAIM_TABS = [
  "all",
  "active",
  "completed",
] as const satisfies readonly ClaimTab[];

export const CLAIMS_PAGE_SIZE = 10;

export type ClaimsQuery = { tab: ClaimTab; page: number };

export function parseClaimsQuery(params: {
  tab?: string;
  page?: string;
}): ClaimsQuery {
  const page = Number(params.page);
  return {
    // An unknown tab falls back to «Всі» rather than erroring: a hand-edited
    // url must never blank the list.
    tab: (CLAIM_TABS as readonly string[]).includes(params.tab ?? "")
      ? (params.tab as ClaimTab)
      : "all",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

export function claimsHref(query: Partial<ClaimsQuery> = {}): string {
  const params = new URLSearchParams();
  if (query.tab && query.tab !== "all") {
    params.set("tab", query.tab);
  }
  // Changing TAB resets to page 1 — a narrower tab may not have the page you
  // were on. The caller says which it means by passing one or the other.
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  const qs = params.toString();
  return `/account/volunteer/claims${qs ? `?${qs}` : ""}`;
}

export function claimsPageCount(total: number): number {
  return Math.max(1, Math.ceil(total / CLAIMS_PAGE_SIZE));
}
