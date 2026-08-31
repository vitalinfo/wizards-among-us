import { describe, expect, it } from "vitest";

import {
  ageBand,
  browseHref,
  browsePageCount,
  BROWSE_ANCHOR,
  BROWSE_PAGE_SIZE,
  parseBrowseQuery,
} from "../browseFilters";

const empty = parseBrowseQuery({});

describe("parseBrowseQuery", () => {
  it("defaults to everything, page 1", () => {
    expect(empty).toEqual({
      region: null,
      availability: "all",
      age: null,
      page: 1,
    });
  });

  it("keeps valid values", () => {
    expect(
      parseBrowseQuery({
        region: "lviv",
        availability: "available",
        age: "5-8",
        page: "3",
      }),
    ).toEqual({
      region: "lviv",
      availability: "available",
      age: "5-8",
      page: 3,
    });
  });

  // A hand-edited url must never blank the list or throw — unknown values are
  // ignored, not rejected.
  it("ignores anything it doesn't recognise", () => {
    const q = parseBrowseQuery({
      region: "atlantis",
      availability: "maybe",
      age: "7-9",
      page: "0",
    });
    expect(q).toEqual({
      region: null,
      availability: "all",
      age: null,
      page: 1,
    });
  });

  // Bands replaced two free-text age inputs, which invited an empty result set
  // from a range nobody meant.
  it("resolves a band to its bounds", () => {
    expect(ageBand("5-8")).toMatchObject({ min: 5, max: 8 });
    expect(ageBand(null)).toBeNull();
  });

  // The application form accepts an age up to 18, so a hard 17 ceiling on the
  // top band would make eighteen-year-olds invisible whenever a band is chosen.
  it("leaves the top band open-ended so nobody is filtered out of existence", () => {
    expect(ageBand("13+")).toMatchObject({ min: 13, max: null });
  });
});

describe("browseHref", () => {
  it("omits defaults so the plain url stays clean", () => {
    expect(browseHref(empty)).toBe(`/volunteer/children#${BROWSE_ANCHOR}`);
  });

  // Filtering and paging must return to the results, not to the page heading —
  // otherwise every click scrolls the list you were reading off the screen.
  it("always anchors to the results", () => {
    expect(browseHref(empty)).toContain(`#${BROWSE_ANCHOR}`);
    expect(browseHref(empty, { page: 2 })).toContain(`#${BROWSE_ANCHOR}`);
    expect(browseHref(empty, { region: "lviv" })).toContain(
      `#${BROWSE_ANCHOR}`,
    );
  });

  it("round-trips a full query", () => {
    const q = parseBrowseQuery({
      region: "kyiv",
      availability: "claimed",
      age: "9-12",
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
