import { describe, expect, it } from "vitest";

import { moderationDecisionSchema } from "../moderation";
import {
  filterToStatus,
  moderationPageCount,
  isDefaultModerationQuery,
  moderationQueueHref,
  moderationSearch,
  parseModerationFilter,
  parseModerationQuery,
  submittedRange,
  parseModerationPage,
  MODERATION_PAGE_SIZE,
} from "../moderationFilter";

const APPLICATION_ID = "11111111-2222-3333-4444-555555555555";

describe("moderationDecisionSchema", () => {
  it("approves without a note and drops any note that was typed", () => {
    const parsed = moderationDecisionSchema.parse({
      applicationId: APPLICATION_ID,
      decision: "approved",
      rejectionNote: "left over from an abandoned rejection",
    });
    // A stale note must not survive onto an approved application.
    expect(parsed).toEqual({
      applicationId: APPLICATION_ID,
      decision: "approved",
      rejectionNote: null,
    });
  });

  it("keeps the note on a rejection", () => {
    const parsed = moderationDecisionSchema.parse({
      applicationId: APPLICATION_ID,
      decision: "rejected",
      rejectionNote: "  Дитині вже виповнилося 18.  ",
    });
    expect(parsed.rejectionNote).toBe("Дитині вже виповнилося 18.");
  });

  // Rejection is final — the parent can't edit and resubmit, so this text is
  // the only explanation they ever get. An empty one is not acceptable.
  it("refuses a rejection with no note", () => {
    for (const rejectionNote of [undefined, "", "   "]) {
      const result = moderationDecisionSchema.safeParse({
        applicationId: APPLICATION_ID,
        decision: "rejected",
        rejectionNote,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.message === "note_required",
          ),
        ).toBe(true);
      }
    }
  });

  it("refuses anything that isn't a real decision", () => {
    for (const decision of ["claimed", "draft", "", "APPROVED", null]) {
      expect(
        moderationDecisionSchema.safeParse({
          applicationId: APPLICATION_ID,
          decision,
          rejectionNote: "x",
        }).success,
      ).toBe(false);
    }
  });

  it("refuses a malformed application id", () => {
    expect(
      moderationDecisionSchema.safeParse({
        applicationId: "not-a-uuid",
        decision: "approved",
      }).success,
    ).toBe(false);
  });
});

describe("moderation queue filter", () => {
  it("defaults to the applications waiting for a decision", () => {
    expect(parseModerationFilter(undefined)).toBe("submitted");
    expect(parseModerationFilter("")).toBe("submitted");
    // Not a status, so it must not silently become a filter.
    expect(parseModerationFilter("everything")).toBe("submitted");
  });

  it("keeps a real status and the explicit 'all'", () => {
    expect(parseModerationFilter("approved")).toBe("approved");
    expect(parseModerationFilter("all")).toBe("all");
  });

  // "all" means no status constraint; every other filter constrains the query.
  it("maps only 'all' to an unconstrained query", () => {
    expect(filterToStatus("all")).toBeUndefined();
    expect(filterToStatus("rejected")).toBe("rejected");
  });

  // The back link from an application must return to the queue the admin was
  // working, so the href is built from the same value the queue read.
  it("round-trips through the queue href", () => {
    for (const filter of ["all", "submitted", "approved"] as const) {
      const href = moderationQueueHref(filter);
      const status = new URL(href, "http://x").searchParams.get("status");
      expect(parseModerationFilter(status ?? undefined)).toBe(filter);
    }
  });
});

describe("moderation queue paging", () => {
  it("treats anything unparseable as page 1", () => {
    for (const value of [undefined, "", "0", "-3", "abc", "1.5", "NaN"]) {
      expect(parseModerationPage(value)).toBe(1);
    }
    expect(parseModerationPage("4")).toBe(4);
  });

  // An empty queue still has one page, so the view renders coherently.
  it("always reports at least one page", () => {
    expect(moderationPageCount(0)).toBe(1);
    expect(moderationPageCount(1)).toBe(1);
  });

  it("counts pages by the page size", () => {
    expect(moderationPageCount(MODERATION_PAGE_SIZE)).toBe(1);
    expect(moderationPageCount(MODERATION_PAGE_SIZE + 1)).toBe(2);
    expect(moderationPageCount(MODERATION_PAGE_SIZE * 3)).toBe(3);
  });

  it("omits page=1 but keeps later pages in the url", () => {
    expect(moderationQueueHref("submitted")).toBe(
      "/admin/applications?status=submitted",
    );
    expect(moderationQueueHref("all", 3)).toBe(
      "/admin/applications?status=all&page=3",
    );
  });

  // The back link from an application must return to the exact view left.
  it("round-trips filter and page together", () => {
    const href = moderationQueueHref("approved", 2);
    const params = new URL(href, "http://x").searchParams;
    expect(parseModerationFilter(params.get("status") ?? undefined)).toBe(
      "approved",
    );
    expect(parseModerationPage(params.get("page") ?? undefined)).toBe(2);
  });
});

describe("parseModerationQuery", () => {
  it("defaults to the queue that needs an admin, with no date bounds", () => {
    expect(parseModerationQuery({})).toEqual({
      filter: "submitted",
      submittedFrom: null,
      submittedTo: null,
      page: 1,
    });
  });

  it("reads a status and a date range out of the url", () => {
    expect(
      parseModerationQuery({
        status: "approved",
        from: "2026-08-25",
        to: "2026-09-01",
        page: "3",
      }),
    ).toEqual({
      filter: "approved",
      submittedFrom: "2026-08-25",
      submittedTo: "2026-09-01",
      page: 3,
    });
  });

  // A url that filters everything out looks like a broken page, not a typo.
  it("drops a backwards range rather than returning nothing", () => {
    const query = parseModerationQuery({
      from: "2026-09-01",
      to: "2026-08-01",
    });
    expect(query.submittedFrom).toBe("2026-09-01");
    expect(query.submittedTo).toBeNull();
  });

  it("ignores a date it cannot read", () => {
    expect(
      parseModerationQuery({ from: "01.09.2026" }).submittedFrom,
    ).toBeNull();
  });
});

describe("submittedRange", () => {
  // Half-open, in Kyiv time: «по 01.09» has to include the whole of that day,
  // and «з 01.09» has to include the applications submitted just after midnight
  // there — three hours before UTC midnight in summer.
  it("covers the whole of both named days", () => {
    const range = submittedRange(
      parseModerationQuery({ from: "2026-09-01", to: "2026-09-01" }),
    );

    expect(range.submittedFrom?.toISOString()).toBe("2026-08-31T21:00:00.000Z");
    expect(range.submittedBefore?.toISOString()).toBe(
      "2026-09-01T21:00:00.000Z",
    );
  });

  it("leaves an unset bound undefined rather than guessing one", () => {
    const range = submittedRange(parseModerationQuery({ from: "2026-09-01" }));
    expect(range.submittedBefore).toBeUndefined();
  });
});

describe("moderationSearch", () => {
  // The queue view rides in the url so returning from an application lands back
  // on the queue the admin was actually working.
  it("round-trips a filtered view", () => {
    const query = parseModerationQuery({
      status: "claimed",
      from: "2026-08-25",
      to: "2026-09-01",
      page: "2",
    });

    expect(
      parseModerationQuery(
        Object.fromEntries(new URLSearchParams(moderationSearch(query))),
      ),
    ).toEqual(query);
  });

  it("omits what is unset", () => {
    expect(moderationSearch(parseModerationQuery({}))).toBe("status=submitted");
  });
});

describe("isDefaultModerationQuery", () => {
  it("is true only when nothing is narrowed", () => {
    expect(isDefaultModerationQuery(parseModerationQuery({}))).toBe(true);
    expect(
      isDefaultModerationQuery(parseModerationQuery({ from: "2026-09-01" })),
    ).toBe(false);
    expect(
      isDefaultModerationQuery(parseModerationQuery({ status: "all" })),
    ).toBe(false);
  });
});
