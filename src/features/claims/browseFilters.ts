import { UKRAINE_REGIONS, type UkraineRegion } from "@/db/enums";

// The volunteer browse filters live in the url so each view is addressable and
// shareable, and so returning from a child lands back where you were — the same
// approach as the admin moderation queue.

export const BROWSE_PAGE_SIZE = 24;

export type Availability = "all" | "available" | "claimed";

export type BrowseQuery = {
  region: UkraineRegion | null;
  availability: Availability;
  minAge: number | null;
  maxAge: number | null;
  page: number;
};

function parseRegion(value: string | undefined): UkraineRegion | null {
  return UKRAINE_REGIONS.includes(value as UkraineRegion)
    ? (value as UkraineRegion)
    : null;
}

function parseAge(value: string | undefined): number | null {
  const age = Number(value);
  // Same bounds the application form enforces; anything else is ignored rather
  // than rejected, so a hand-edited url can't blank the list with an error.
  return Number.isInteger(age) && age >= 0 && age <= 18 ? age : null;
}

export function parseBrowseQuery(params: {
  region?: string;
  availability?: string;
  minAge?: string;
  maxAge?: string;
  page?: string;
}): BrowseQuery {
  const page = Number(params.page);
  const minAge = parseAge(params.minAge);
  const maxAge = parseAge(params.maxAge);
  return {
    region: parseRegion(params.region),
    availability:
      params.availability === "available" || params.availability === "claimed"
        ? params.availability
        : "all",
    // A reversed range would return nothing and look like "no children", so
    // swap it rather than honouring the mistake.
    minAge:
      minAge !== null && maxAge !== null ? Math.min(minAge, maxAge) : minAge,
    maxAge:
      minAge !== null && maxAge !== null ? Math.max(minAge, maxAge) : maxAge,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
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
  const page = changedFilter ? 1 : next.page;

  const params = new URLSearchParams();
  if (next.region) {
    params.set("region", next.region);
  }
  if (next.availability !== "all") {
    params.set("availability", next.availability);
  }
  if (next.minAge !== null) {
    params.set("minAge", String(next.minAge));
  }
  if (next.maxAge !== null) {
    params.set("maxAge", String(next.maxAge));
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `/volunteer/children?${qs}` : "/volunteer/children";
}

export function browsePageCount(total: number): number {
  return Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
}
