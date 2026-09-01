import { UKRAINE_REGIONS, type UkraineRegion } from "@/db/enums";

// The volunteer browse filters live in the url so each view is addressable and
// shareable, and so returning from a child lands back where you were — the same
// approach as the admin moderation queue.

export const BROWSE_PAGE_SIZE = 24;

// The results list, so filter/pager navigation returns to it.
export const BROWSE_ANCHOR = "children";

export type Availability = "all" | "available" | "claimed";

// Age is picked as a BAND, not two free-text numbers: a volunteer thinks "a
// child in primary school", not "between 5 and 8", and two inputs invite an
// empty result set from a range nobody meant.
//
// The top band is 13+ rather than 13–17 deliberately: the application form
// accepts an age up to 18, so a hard 17 ceiling would make eighteen-year-olds
// invisible whenever any band is selected.
export const AGE_BANDS = [
  { key: "0-4", min: 0, max: 4 },
  { key: "5-8", min: 5, max: 8 },
  { key: "9-12", min: 9, max: 12 },
  { key: "13+", min: 13, max: null },
] as const;

export type AgeBandKey = (typeof AGE_BANDS)[number]["key"];

export function ageBand(key: AgeBandKey | null) {
  return AGE_BANDS.find((band) => band.key === key) ?? null;
}

export type BrowseQuery = {
  // The region the family LEFT (applications.home_region), not where they are
  // now — volunteers look for families from a place they have a tie to.
  region: UkraineRegion | null;
  availability: Availability;
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
  availability?: string;
  age?: string;
  page?: string;
}): BrowseQuery {
  const page = Number(params.page);
  return {
    region: parseRegion(params.region),
    availability:
      params.availability === "available" || params.availability === "claimed"
        ? params.availability
        : "all",
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
  if (query.availability !== "all") {
    params.set("availability", query.availability);
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
  return `/volunteer/children${qs ? `?${qs}` : ""}#${BROWSE_ANCHOR}`;
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

// The url that opens the claim confirmation for one child, preserving the view
// the volunteer is looking at.
//
// This exists because appending "?claim=..." to browseHref's output produced
// `/volunteer/children#children?claim=<id>` — the query landed INSIDE the
// fragment, so the server never saw it and the modal silently never opened.
// Building the params first and adding the fragment last is the only ordering
// that works, so no caller should be assembling this by hand.
export function claimHref(
  query: BrowseQuery,
  page: number,
  applicationId: string,
): string {
  const params = browseParams(query, page);
  params.set("claim", applicationId);
  return browseUrl(params);
}

export function browsePageCount(total: number): number {
  return Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
}
