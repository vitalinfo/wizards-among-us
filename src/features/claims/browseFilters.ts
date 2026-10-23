import { UKRAINE_REGIONS, type UkraineRegion } from "@/db/enums";
import { CHILD_AGE_MAX } from "@/lib/applicationFieldOptions";

// The volunteer browse filters live in the url so each view is addressable and
// shareable, and so returning from a child lands back where you were — the same
// approach as the admin moderation queue.

export const BROWSE_PAGE_SIZE = 24;

// The results list, so filter/pager navigation returns to it.
export const BROWSE_ANCHOR = "children";

// Age is picked as a BAND, not two free-text numbers: a volunteer thinks "a
// child in primary school", not "between 5 and 8", and two inputs invite an
// empty result set from a range nobody meant.
//
// The top band closes at 17 because CHILD_AGE_MAX does: the form cannot record
// an older child, so there is nothing an open-ended 13+ would catch. (It was
// 13+ while the form still accepted 18.) The bands together cover the whole
// range — no age can fall outside every band.
export const AGE_BANDS = [
  { key: "0-4", min: 0, max: 4 },
  { key: "5-8", min: 5, max: 8 },
  { key: "9-12", min: 9, max: 12 },
  { key: "13-17", min: 13, max: CHILD_AGE_MAX },
] as const;

export type AgeBandKey = (typeof AGE_BANDS)[number]["key"];

export function ageBand(key: AgeBandKey | null) {
  return AGE_BANDS.find((band) => band.key === key) ?? null;
}

export type BrowseQuery = {
  // The region the family LEFT (applications.home_region), not where they are
  // now — volunteers look for families from a place they have a tie to.
  region: UkraineRegion | null;
  age: AgeBandKey | null;
  page: number;
};

function parseRegion(value: string | undefined): UkraineRegion | null {
  return UKRAINE_REGIONS.includes(value as UkraineRegion)
    ? (value as UkraineRegion)
    : null;
}

function parseAgeBand(value: string | undefined): AgeBandKey | null {
  // Unknown values are ignored rather than rejected, so a hand-edited url can
  // never blank the list with an error.
  return AGE_BANDS.some((band) => band.key === value)
    ? (value as AgeBandKey)
    : null;
}

export function parseBrowseQuery(params: {
  region?: string;
  age?: string;
  page?: string;
}): BrowseQuery {
  const page = Number(params.page);
  return {
    region: parseRegion(params.region),
    age: parseAgeBand(params.age),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

// The query string for a browse view. Shared so every link is built the same
// way — see browseHref for why that matters.
function browseParams(query: BrowseQuery, page: number): URLSearchParams {
  const params = new URLSearchParams();
  if (query.region) {
    params.set("region", query.region);
  }
  if (query.age !== null) {
    params.set("age", query.age);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  return params;
}

function browseUrl(params: URLSearchParams): string {
  const qs = params.toString();
  // The fragment goes LAST. It keeps paging and filtering anchored to the
  // results instead of scrolling back to the page heading.
  return `/account/volunteer/children${qs ? `?${qs}` : ""}#${BROWSE_ANCHOR}`;
}

// Rebuild the url for a query, optionally overriding parts of it. Any change to
// a FILTER resets to page 1 — a narrower filter may not have the page you were
// on.
export function browseHref(
  query: BrowseQuery,
  override: Partial<BrowseQuery> = {},
): string {
  const next = { ...query, ...override };
  const changedFilter = Object.keys(override).some((key) => key !== "page");
  return browseUrl(browseParams(next, changedFilter ? 1 : next.page));
}

// The url of the claim briefing for one child, carrying the view the volunteer
// is looking at so «×» and a refused claim both come back to it.
//
// A PAGE, not a `?claim=` parameter on this one (Figma 118:420 «Погодження»):
// what a volunteer agrees to before taking a child is a screenful of
// obligations — a budget, a deadline, a physical letter to post — and that is
// not a modal. The old parameter is gone with it; the only thing that put a
// child behind a confirmation was a row on the current page, and now the child
// is in the path.
//
// `return` is a url this app produced, but it arrives back through a query
// string, so every reader passes it through safeReturnPath before using it.
export function claimHref(
  query: BrowseQuery,
  page: number,
  applicationId: string,
): string {
  const params = new URLSearchParams({
    return: browseUrl(browseParams(query, page)),
  });
  return `/account/volunteer/children/${applicationId}/claim?${params}`;
}

export function browsePageCount(total: number): number {
  return Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
}
