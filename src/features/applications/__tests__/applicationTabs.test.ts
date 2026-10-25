import { describe, expect, it } from "vitest";

import { APPLICATION_STATUSES } from "@/db/enums";

import {
  APPLICATION_TABS,
  applicationsHref,
  applicationsPageCount,
  APPLICATIONS_PAGE_SIZE,
  dialogHref,
  parseDialog,
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

describe("dialogs", () => {
  it("open over the view they were opened from", () => {
    expect(dialogHref({ tab: "all", page: 1 }, "delete", "a1")).toBe(
      "/account/parent/applications?dialog=delete&id=a1",
    );
    expect(dialogHref({ tab: "claimed", page: 3 }, "receive", "a1")).toBe(
      "/account/parent/applications?tab=claimed&page=3&dialog=receive&id=a1",
    );
    expect(
      dialogHref({ tab: "all", page: 1 }, "receive", "a1", {
        blocked: "no_photo",
      }),
    ).toBe(
      "/account/parent/applications?dialog=receive&id=a1&blocked=no_photo",
    );
  });

  it("parses only a known dialog with an id", () => {
    expect(parseDialog({ dialog: "review", id: "a1" })).toEqual({
      dialog: "review",
      id: "a1",
    });
    expect(parseDialog({ dialog: "review" })).toBeNull();
    expect(parseDialog({ dialog: "drop-table", id: "a1" })).toBeNull();
    expect(parseDialog({})).toBeNull();
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
