import { describe, expect, it } from "vitest";

import { CHILD_AGE_MAX, CHILD_AGE_MIN } from "@/lib/applicationFieldOptions";

import {
  AGE_BANDS,
  ageBand,
  browseHref,
  browsePageCount,
  claimHref,
  BROWSE_ANCHOR,
  BROWSE_PAGE_SIZE,
  parseBrowseQuery,
} from "../browseFilters";

const empty = parseBrowseQuery({});

describe("parseBrowseQuery", () => {
  it("defaults to everything, page 1", () => {
    expect(empty).toEqual({
      region: null,
      age: null,
      page: 1,
    });
  });

  it("keeps valid values", () => {
    expect(
      parseBrowseQuery({
        region: "lviv",
        age: "5-8",
        page: "3",
      }),
    ).toEqual({
      region: "lviv",
      age: "5-8",
      page: 3,
    });
  });

  // A hand-edited url must never blank the list or throw — unknown values are
  // ignored, not rejected.
  it("ignores anything it doesn't recognise", () => {
    const q = parseBrowseQuery({
      region: "atlantis",
      age: "7-9",
      page: "0",
    });
    expect(q).toEqual({
      region: null,
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

  // The bands must tile the whole recordable range: an age that matches no band
  // would be invisible whenever a volunteer filters at all.
  it("covers every age the form can record", () => {
    expect(ageBand("13-17")).toMatchObject({ min: 13, max: CHILD_AGE_MAX });

    for (let age = CHILD_AGE_MIN; age <= CHILD_AGE_MAX; age += 1) {
      const matching = AGE_BANDS.filter(
        (band) => age >= band.min && age <= band.max,
      );
      expect(matching, `age ${age}`).toHaveLength(1);
    }
  });
});

describe("browseHref", () => {
  it("omits defaults so the plain url stays clean", () => {
    expect(browseHref(empty)).toBe(
      `/account/volunteer/children#${BROWSE_ANCHOR}`,
    );
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

// The claim link now points at the briefing PAGE, with the browse view carried
// in `return` so «×» and a refused claim both land back on it.
//
// Regression it replaces: the link used to be built by appending "?claim=..."
// to browseHref's output, which already ended in "#children". The query landed
// INSIDE the fragment, so the server never saw it and the confirmation silently
// never opened. The `return` value has the same hazard — it ENDS in a fragment
// — which is why it goes through URLSearchParams rather than string
// concatenation.
describe("claimHref", () => {
  const query = parseBrowseQuery({ region: "lviv", age: "5-8", page: "2" });

  it("addresses the child in the path, not in a query parameter", () => {
    const url = new URL(claimHref(query, 2, "app-1"), "http://x");
    expect(url.pathname).toBe("/account/volunteer/children/app-1/claim");
    expect(url.searchParams.get("claim")).toBeNull();
  });

  it("carries the browse view back, fragment and all", () => {
    const url = new URL(claimHref(query, 2, "app-1"), "http://x");
    const back = new URL(url.searchParams.get("return") ?? "", "http://x");

    expect(back.pathname).toBe("/account/volunteer/children");
    expect(back.searchParams.get("region")).toBe("lviv");
    expect(back.searchParams.get("age")).toBe("5-8");
    expect(back.searchParams.get("page")).toBe("2");
    expect(back.hash).toBe(`#${BROWSE_ANCHOR}`);
  });

  // The fragment must survive the round trip ENCODED: a raw "#children" in the
  // query would truncate the parameter at the browser, and the volunteer would
  // come back to the top of an unfiltered page.
  it("encodes the fragment inside the parameter", () => {
    const href = claimHref(query, 2, "app-1");
    expect(href).toContain("%23children");
    expect(href).not.toMatch(/#/);
  });

  it("works from the unfiltered first page too", () => {
    const url = new URL(
      claimHref(parseBrowseQuery({}), 1, "app-2"),
      "http://x",
    );
    expect(url.pathname).toBe("/account/volunteer/children/app-2/claim");
    const back = new URL(url.searchParams.get("return") ?? "", "http://x");
    expect(back.searchParams.get("page")).toBeNull();
  });
});
