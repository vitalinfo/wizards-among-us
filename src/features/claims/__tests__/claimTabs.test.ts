import { describe, expect, it } from "vitest";

import {
  CLAIM_TABS,
  claimDialogHref,
  claimsHref,
  parseClaimDialog,
  parseClaimsQuery,
} from "../claimTabs";

describe("parseClaimsQuery", () => {
  it("defaults to «Всі», page 1, ten a page", () => {
    expect(parseClaimsQuery({})).toEqual({ tab: "all", page: 1, per: 10 });
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
    expect(claimsHref({ tab: "all", page: 1, per: 10 })).toBe(
      "/account/volunteer/claims",
    );
  });

  it("round-trips a tab, a page and a size", () => {
    const href = claimsHref({ tab: "completed", page: 3, per: 20 });
    const params = Object.fromEntries(
      new URL(href, "http://x").searchParams.entries(),
    );
    expect(parseClaimsQuery(params)).toEqual({
      tab: "completed",
      page: 3,
      per: 20,
    });
  });
});

// The «Опрацьовано» confirmation is a url, so it must round-trip and keep the
// view of the list it was opened from.
describe("claim dialogs", () => {
  it("builds a dialog url on top of the current view", () => {
    expect(
      claimDialogHref({ tab: "all", page: 1, per: 10 }, "process", "a1"),
    ).toBe("/account/volunteer/claims?dialog=process&id=a1");
    expect(
      claimDialogHref({ tab: "active", page: 2, per: 20 }, "unprocess", "a2"),
    ).toBe(
      "/account/volunteer/claims?tab=active&page=2&per=20&dialog=unprocess&id=a2",
    );
  });

  it("parses the two dialogs and nothing else", () => {
    expect(parseClaimDialog({ dialog: "process", id: "a1" })).toEqual({
      dialog: "process",
      id: "a1",
    });
    expect(parseClaimDialog({ dialog: "unprocess", id: "a1" })).toEqual({
      dialog: "unprocess",
      id: "a1",
    });
    expect(parseClaimDialog({ dialog: "release", id: "a1" })).toBeNull();
    expect(parseClaimDialog({ dialog: "process" })).toBeNull();
    expect(parseClaimDialog({})).toBeNull();
  });
});
