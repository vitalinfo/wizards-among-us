import {
  DEFAULT_PAGE_SIZE,
  parsePageSize,
  type PageSize,
} from "@/lib/pageSize";

import type { ClaimTab } from "./queries";

// The url grammar for «Мої підопічні» — the tab, the page and the page size,
// so every view is addressable and the browser's back button returns to the
// one you were on.
// Same approach as the browse filters and the moderation queue.

export const CLAIM_TABS = [
  "all",
  "active",
  "completed",
] as const satisfies readonly ClaimTab[];

export type ClaimsQuery = { tab: ClaimTab; page: number; per: PageSize };

export function parseClaimsQuery(params: {
  tab?: string;
  page?: string;
  per?: string;
}): ClaimsQuery {
  const page = Number(params.page);
  return {
    // An unknown tab falls back to «Всі» rather than erroring: a hand-edited
    // url must never blank the list.
    tab: (CLAIM_TABS as readonly string[]).includes(params.tab ?? "")
      ? (params.tab as ClaimTab)
      : "all",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    per: parsePageSize(params.per),
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
  // Kept on every link, tabs included, so a chosen size is not undone by the
  // next click.
  if (query.per && query.per !== DEFAULT_PAGE_SIZE) {
    params.set("per", String(query.per));
  }
  const qs = params.toString();
  return `/account/volunteer/claims${qs ? `?${qs}` : ""}`;
}
