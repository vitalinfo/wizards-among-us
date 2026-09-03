import { describe, expect, it } from "vitest";

import {
  auditHref,
  auditPageCount,
  parseAuditQuery,
  splitAuditAction,
  AUDIT_PAGE_SIZE,
} from "../listQuery";

describe("parseAuditQuery", () => {
  it("starts at the newest page", () => {
    expect(parseAuditQuery({})).toEqual({ page: 1 });
  });

  // A bad page in a url must never be able to blank the log — the one place
  // where "nothing here" and "we failed to show you" look identical.
  it("falls back to page 1 rather than erroring", () => {
    for (const page of ["0", "-3", "abc", "2.5", ""]) {
      expect(parseAuditQuery({ page }).page).toBe(1);
    }
    expect(parseAuditQuery({ page: "4" }).page).toBe(4);
  });
});

describe("auditPageCount", () => {
  it("is at least one, so an empty log still renders", () => {
    expect(auditPageCount(0)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(auditPageCount(AUDIT_PAGE_SIZE)).toBe(1);
    expect(auditPageCount(AUDIT_PAGE_SIZE + 1)).toBe(2);
  });
});

describe("auditHref", () => {
  it("keeps the first page's url plain", () => {
    expect(auditHref(1)).toBe("/admin/audit");
  });

  it("round-trips a later page", () => {
    const href = auditHref(3);
    expect(
      parseAuditQuery(
        Object.fromEntries(new URLSearchParams(href.split("?")[1])),
      ).page,
    ).toBe(3);
  });
});

describe("splitAuditAction", () => {
  it("leaves a plain action alone", () => {
    expect(splitAuditAction("application.submitted")).toEqual([
      "application.submitted",
      null,
    ]);
  });

  it("separates the detail a code carries", () => {
    expect(splitAuditAction("application.file_viewed:idp_certificate")).toEqual(
      ["application.file_viewed", "idp_certificate"],
    );
  });

  // The detail is a comma-separated field list. Splitting on the LAST colon, or
  // on every colon, would silently truncate the record of what an admin
  // changed — which is the one thing this row exists to say.
  it("splits only on the first colon", () => {
    expect(
      splitAuditAction("application.updated_by_admin:childName,giftPrice"),
    ).toEqual(["application.updated_by_admin", "childName,giftPrice"]);
    expect(splitAuditAction("a:b:c")).toEqual(["a", "b:c"]);
  });

  it("survives a trailing colon rather than inventing a detail", () => {
    expect(splitAuditAction("weird:")).toEqual(["weird", ""]);
  });
});
