import { describe, expect, it } from "vitest";

import { APPLICATION_STATUSES } from "@/db/enums";

import {
  APPLICATION_TABS,
  applicationsHref,
  applicationsPageCount,
  APPLICATIONS_PAGE_SIZE,
  confirmDeleteHref,
  parseApplicationsQuery,
  tabStatuses,
} from "../applicationTabs";

describe("parseApplicationsQuery", () => {
  it("reads a known tab and a positive page", () => {
    expect(parseApplicationsQuery({ tab: "draft", page: "3" })).toEqual({
      tab: "draft",
      page: 3,
    });
  });

  // A hand-edited url must never blank the list or reach the database as an
  // arbitrary status.
  it("falls back to «Всі» and page 1 for anything else", () => {
    for (const params of [
      {},
      { tab: "deleted", page: "0" },
      { tab: "DRAFT", page: "-2" },
      { tab: "draft' OR 1=1", page: "1.5" },
      { page: "abc" },
    ]) {
      const query = parseApplicationsQuery(params);
      expect(APPLICATION_TABS).toContain(query.tab);
      expect(query.page).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(query.page)).toBe(true);
    }
    expect(parseApplicationsQuery({ tab: "nope" }).tab).toBe("all");
  });
});

describe("applicationsHref", () => {
  it("keeps the default view's url bare", () => {
    expect(applicationsHref()).toBe("/account/parent/applications");
    expect(applicationsHref({ tab: "all", page: 1 })).toBe(
      "/account/parent/applications",
    );
  });

  it("carries the tab and the page", () => {
    expect(applicationsHref({ tab: "claimed", page: 2 })).toBe(
      "/account/parent/applications?tab=claimed&page=2",
    );
  });

  // The delete action redirects through this with values that came off a
  // form. Whatever goes in, it must come out as a path on this list.
  it("never leaves the list, whatever the form carried", () => {
    for (const params of [
      { tab: "https://evil.example", page: "2" },
      { tab: "//evil.example", page: "1" },
      { tab: "draft", page: "/../../admin" },
    ]) {
      const href = applicationsHref(parseApplicationsQuery(params));
      expect(href.startsWith("/account/parent/applications")).toBe(true);
      expect(href).not.toContain("evil");
      expect(href).not.toContain("..");
    }
  });
});

describe("confirmDeleteHref", () => {
  it("opens the confirmation over the view the bin was pressed on", () => {
    expect(confirmDeleteHref({ tab: "all", page: 1 }, "a1")).toBe(
      "/account/parent/applications?confirm=delete&id=a1",
    );
    expect(confirmDeleteHref({ tab: "draft", page: 3 }, "a1")).toBe(
      "/account/parent/applications?tab=draft&page=3&confirm=delete&id=a1",
    );
  });
});

describe("tab statuses", () => {
  it("«Всі» lists every status; each other tab lists only its own", () => {
    expect([...tabStatuses("all")]).toEqual([...APPLICATION_STATUSES]);
    for (const status of APPLICATION_STATUSES) {
      expect(tabStatuses(status)).toEqual([status]);
    }
  });

  it("has a tab for every status, in the order an application moves", () => {
    expect(APPLICATION_TABS).toEqual(["all", ...APPLICATION_STATUSES]);
  });
});

describe("applicationsPageCount", () => {
  it("is at least one page, and rounds up", () => {
    expect(applicationsPageCount(0)).toBe(1);
    expect(applicationsPageCount(APPLICATIONS_PAGE_SIZE)).toBe(1);
    expect(applicationsPageCount(APPLICATIONS_PAGE_SIZE + 1)).toBe(2);
  });
});
