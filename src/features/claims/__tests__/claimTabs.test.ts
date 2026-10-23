import { describe, expect, it } from "vitest";

import {
  CLAIM_TABS,
  CLAIMS_PAGE_SIZE,
  claimsHref,
  claimsPageCount,
  parseClaimsQuery,
} from "../claimTabs";

describe("parseClaimsQuery", () => {
  it("defaults to «Всі», page 1", () => {
    expect(parseClaimsQuery({})).toEqual({ tab: "all", page: 1 });
  });

  it("keeps the three tabs the design has", () => {
    for (const tab of CLAIM_TABS) {
      expect(parseClaimsQuery({ tab }).tab).toBe(tab);
    }
  });

  // A hand-edited url must never blank the list or throw.
  it("falls back to «Всі» for anything else", () => {
    expect(parseClaimsQuery({ tab: "archived" }).tab).toBe("all");
    expect(parseClaimsQuery({ page: "0" }).page).toBe(1);
    expect(parseClaimsQuery({ page: "-3" }).page).toBe(1);
    expect(parseClaimsQuery({ page: "two" }).page).toBe(1);
  });
});

describe("claimsHref", () => {
  // «Всі» and page 1 are the defaults, so they stay out of the url — otherwise
  // the tab you land on has a longer address than the one you clicked.
  it("leaves the defaults out", () => {
    expect(claimsHref()).toBe("/account/volunteer/claims");
    expect(claimsHref({ tab: "all", page: 1 })).toBe(
      "/account/volunteer/claims",
    );
  });

  it("round-trips a tab and a page", () => {
    const href = claimsHref({ tab: "completed", page: 3 });
    const params = Object.fromEntries(
      new URL(href, "http://x").searchParams.entries(),
    );
    expect(parseClaimsQuery(params)).toEqual({ tab: "completed", page: 3 });
  });
});

describe("claimsPageCount", () => {
  it("is never zero, so «page 1 of 0» cannot be rendered", () => {
    expect(claimsPageCount(0)).toBe(1);
  });

  it("counts by page size", () => {
    expect(claimsPageCount(CLAIMS_PAGE_SIZE)).toBe(1);
    expect(claimsPageCount(CLAIMS_PAGE_SIZE + 1)).toBe(2);
  });
});
