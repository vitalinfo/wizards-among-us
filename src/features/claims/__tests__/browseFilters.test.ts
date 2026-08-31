import { describe, expect, it } from "vitest";

import {
  browseHref,
  browsePageCount,
  BROWSE_PAGE_SIZE,
  parseBrowseQuery,
} from "../browseFilters";

const empty = parseBrowseQuery({});

describe("parseBrowseQuery", () => {
  it("defaults to everything, page 1", () => {
    expect(empty).toEqual({
      region: null,
      availability: "all",
      minAge: null,
      maxAge: null,
      page: 1,
    });
  });

  it("keeps valid values", () => {
    expect(
      parseBrowseQuery({
        region: "lviv",
        availability: "available",
        minAge: "5",
        maxAge: "12",
        page: "3",
      }),
    ).toEqual({
      region: "lviv",
      availability: "available",
      minAge: 5,
      maxAge: 12,
      page: 3,
    });
  });

  // A hand-edited url must never blank the list or throw — unknown values are
  // ignored, not rejected.
  it("ignores anything it doesn't recognise", () => {
    const q = parseBrowseQuery({
      region: "atlantis",
      availability: "maybe",
      minAge: "-4",
      maxAge: "99",
      page: "0",
    });
    expect(q).toEqual({
      region: null,
      availability: "all",
      minAge: null,
      maxAge: null,
      page: 1,
    });
  });

  // A reversed range matches nothing and reads as "no children here", which is
  // a lie about the data — swap it instead.
  it("swaps a reversed age range", () => {
    const q = parseBrowseQuery({ minAge: "12", maxAge: "5" });
    expect([q.minAge, q.maxAge]).toEqual([5, 12]);
  });
});

describe("browseHref", () => {
  it("omits defaults so the plain url stays clean", () => {
    expect(browseHref(empty)).toBe("/volunteer/children");
  });

  it("round-trips a full query", () => {
    const q = parseBrowseQuery({
      region: "kyiv",
      availability: "claimed",
      minAge: "6",
      maxAge: "9",
      page: "2",
    });
    const href = browseHref(q);
    const params = Object.fromEntries(
      new URL(href, "http://x").searchParams.entries(),
    );
    expect(parseBrowseQuery(params)).toEqual(q);
  });

  // A narrower filter may not have the page you were on, so a filter change
  // that kept ?page=7 would show an empty list.
  it("resets to page 1 when a filter changes, but not when paging", () => {
    const onPage3 = parseBrowseQuery({ page: "3", region: "lviv" });
    expect(browseHref(onPage3, { region: "kyiv" })).not.toContain("page=");
    expect(browseHref(onPage3, { page: 4 })).toContain("page=4");
  });
});

describe("browsePageCount", () => {
  it("always has at least one page", () => {
    expect(browsePageCount(0)).toBe(1);
  });

  it("counts by page size", () => {
    expect(browsePageCount(BROWSE_PAGE_SIZE)).toBe(1);
    expect(browsePageCount(BROWSE_PAGE_SIZE + 1)).toBe(2);
  });
});
