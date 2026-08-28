import { describe, expect, it } from "vitest";

import { moderationDecisionSchema } from "../moderation";

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
