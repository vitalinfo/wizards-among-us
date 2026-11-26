import { describe, expect, it } from "vitest";

import {
  auditActorHref,
  auditAdminLogHref,
  auditUserLogHref,
  auditExportHref,
  auditHref,
  auditPageCount,
  isDefaultAuditQuery,
  parseAuditQuery,
  auditTargetHref,
  splitAuditAction,
  AUDIT_PAGE_SIZE,
} from "../listQuery";

describe("parseAuditQuery", () => {
  it("starts at the newest page, unfiltered", () => {
    expect(parseAuditQuery({})).toEqual({
      action: null,
      reason: null,
      targetId: null,
      actorType: null,
      actorId: null,
      ip: null,
      page: 1,
    });
  });

  it("reads an action and a target id", () => {
    expect(
      parseAuditQuery({
        action: "application.approved",
        target: " d75c6aa0-d3c3-468b-bffa-6ca82a25a1da ",
      }),
    ).toEqual({
      action: "application.approved",
      reason: null,
      targetId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
      actorType: null,
      actorId: null,
      ip: null,
      page: 1,
    });
  });

  // A reason is a bare code: anything else could never match one, and must
  // not count as a filter.
  it("reads a failure reason, and drops anything but a code", () => {
    expect(parseAuditQuery({ reason: " blocked " }).reason).toBe("blocked");
    expect(isDefaultAuditQuery(parseAuditQuery({ reason: "blocked" }))).toBe(
      false,
    );
    for (const reason of ["", "blocked:x", "a.b", "Blocked"]) {
      const query = parseAuditQuery({ reason });
      expect(query.reason).toBeNull();
      expect(isDefaultAuditQuery(query)).toBe(true);
    }
  });

  it("reads an actor id, and drops a malformed one", () => {
    const actor = "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11";
    expect(parseAuditQuery({ actor: ` ${actor} ` }).actorId).toBe(actor);
    const bad = parseAuditQuery({ actor: "admin@example.com" });
    expect(bad.actorId).toBeNull();
    expect(isDefaultAuditQuery(bad)).toBe(true);
    expect(isDefaultAuditQuery(parseAuditQuery({ actor }))).toBe(false);
  });

  // A type alone is a filter — "everything any admin did".
  it("reads an actor type, and drops anything but a known one", () => {
    expect(parseAuditQuery({ actorType: " admin " }).actorType).toBe("admin");
    expect(parseAuditQuery({ actorType: "user" }).actorType).toBe("user");
    expect(isDefaultAuditQuery(parseAuditQuery({ actorType: "admin" }))).toBe(
      false,
    );
    for (const actorType of ["", "Admin", "banned", "admins"]) {
      const query = parseAuditQuery({ actorType });
      expect(query.actorType).toBeNull();
      expect(isDefaultAuditQuery(query)).toBe(true);
    }
  });

  // Exact, and lowercased: IPv6 hex can arrive in either case.
  it("reads an IP address, and drops anything that could never be one", () => {
    expect(parseAuditQuery({ ip: " 109.108.250.136 " }).ip).toBe(
      "109.108.250.136",
    );
    expect(parseAuditQuery({ ip: "2A02:2378::1" }).ip).toBe("2a02:2378::1");
    expect(isDefaultAuditQuery(parseAuditQuery({ ip: "10.0.0.1" }))).toBe(
      false,
    );
    for (const ip of ["", "  ", "10.0.0.1/24", "localhost", "1".repeat(46)]) {
      const query = parseAuditQuery({ ip });
      expect(query.ip).toBeNull();
      expect(isDefaultAuditQuery(query)).toBe(true);
    }
  });

  // Postgres errors on a malformed uuid, so one in the url must not reach it.
  it("drops a blank action and a malformed id", () => {
    const query = parseAuditQuery({ action: "  ", target: "index.php" });
    expect(query.action).toBeNull();
    expect(query.targetId).toBeNull();
    expect(isDefaultAuditQuery(query)).toBe(true);
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
  const unfiltered = parseAuditQuery({});

  it("keeps the first page's url plain", () => {
    expect(auditHref(unfiltered, 1)).toBe("/admin/audit");
  });

  it("round-trips a later page with its filters", () => {
    const query = {
      action: "application.approved",
      reason: "blocked",
      targetId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
      actorType: "user" as const,
      actorId: "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11",
      ip: "109.108.250.136",
      page: 1,
    };
    const href = auditHref(query, 3);
    expect(
      parseAuditQuery(
        Object.fromEntries(new URLSearchParams(href.split("?")[1])),
      ),
    ).toEqual({ ...query, page: 3 });
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

// Without these the trail records a uuid and leaves you to paste it somewhere.
describe("auditTargetHref", () => {
  it("opens the thing the row is about", () => {
    expect(auditTargetHref("application", "a1")).toBe("/admin/applications/a1");
    expect(auditTargetHref("user", "u1")).toBe("/admin/users/u1");
    expect(auditTargetHref("campaign", "c1")).toBe("/admin/campaigns/c1/edit");
  });

  // There is no per-review page; the list is the right surface, and landing
  // there beats landing nowhere.
  it("sends a review to the list it lives on", () => {
    expect(auditTargetHref("review", "r1")).toBe("/admin/reviews");
    expect(auditTargetHref("review", null)).toBe("/admin/reviews");
  });

  // An export's target is the admin whose activity was taken.
  it("sends an admin to their own log", () => {
    expect(auditTargetHref("admin", "a1")).toBe(
      "/admin/audit?actorType=admin&actor=a1",
    );
  });

  it("has nowhere to send a settings row", () => {
    expect(auditTargetHref("settings", null)).toBeNull();
  });

  // The log is append-only: rows written by an older build can name things this
  // one has never heard of. That is not an error, and must not be a broken
  // link either.
  it("refuses to invent a url for a type it does not know", () => {
    expect(auditTargetHref("something_new", "x1")).toBeNull();
    expect(auditTargetHref("application", null)).toBeNull();
  });
});

describe("auditActorHref", () => {
  it("opens the person who acted", () => {
    expect(auditActorHref("user", "u1")).toBe("/admin/users/u1");
  });

  // An admin has no page of their own; their log is what there is to open.
  it("opens an admin's own log", () => {
    expect(auditActorHref("admin", "a1")).toBe(
      "/admin/audit?actorType=admin&actor=a1",
    );
    expect(auditAdminLogHref("a1")).toBe(
      "/admin/audit?actorType=admin&actor=a1",
    );
  });
});

describe("auditUserLogHref", () => {
  // The type with the id, so the filter shows who it is narrowed to — and the
  // export it offers is that user's.
  it("narrows the log to one user", () => {
    expect(auditUserLogHref("u1")).toBe("/admin/audit?actorType=user&actor=u1");
  });
});

describe("auditExportHref", () => {
  // The CSV is the view on screen, all of it — a page number would make it
  // look like a filter while exporting everything anyway.
  it("carries the filters and drops the page", () => {
    expect(
      auditExportHref({
        action: "application.approved",
        reason: "blocked",
        targetId: null,
        actorType: "admin",
        actorId: "a1",
        ip: "2a02:2378::1",
        page: 4,
      }),
    ).toBe(
      "/admin/audit/export?action=application.approved&reason=blocked&actorType=admin&actor=a1&ip=2a02%3A2378%3A%3A1",
    );
  });
});
