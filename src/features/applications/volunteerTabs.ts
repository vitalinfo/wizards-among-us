import type { ClaimsQuery } from "@/features/claims/claimTabs";
import { DEFAULT_PAGE_SIZE } from "@/lib/pageSize";

// The url grammar for «Мої Чарівники» — the same three tabs and the same
// parsing as «Мої підопічні» (parseClaimsQuery, CLAIM_TABS),
// seen from the family's side; only the path differs.
export function myVolunteersHref(query: Partial<ClaimsQuery> = {}): string {
  const params = new URLSearchParams();
  if (query.tab && query.tab !== "all") {
    params.set("tab", query.tab);
  }
  if (query.page && query.page > 1) {
    params.set("page", String(query.page));
  }
  if (query.per && query.per !== DEFAULT_PAGE_SIZE) {
    params.set("per", String(query.per));
  }
  const qs = params.toString();
  return `/account/parent/my-volunteer${qs ? `?${qs}` : ""}`;
}
