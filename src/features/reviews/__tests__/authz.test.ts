import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/actor";

import { canModerateReviews, getReviewBlockReason } from "../authz";

const parent: Actor = {
  kind: "user",
  id: "p1",
  username: "p1",
  firstName: "Petro",
  roles: ["parent"],
};
const other: Actor = { ...parent, id: "p2", username: "p2" };
const admin: Actor = { kind: "admin", id: "a1", email: "a@example.test" };

const fresh = { alreadyReviewed: false };

describe("getReviewBlockReason", () => {
  it("lets the owning parent review a fulfilled application", () => {
    expect(
      getReviewBlockReason(
        parent,
        { parentId: "p1", status: "fulfilled" },
        fresh,
      ),
    ).toBeNull();
  });

  // Vital, Phase 7: a review means something because the experience finished.
  it("refuses until the wish is actually fulfilled", () => {
    for (const status of [
      "claimed",
      "approved",
      "submitted",
      "draft",
    ] as const) {
      expect(
        getReviewBlockReason(parent, { parentId: "p1", status }, fresh),
      ).toBe("not_fulfilled");
    }
  });

  it("refuses someone else's application", () => {
    expect(
      getReviewBlockReason(
        other,
        { parentId: "p1", status: "fulfilled" },
        fresh,
      ),
    ).toBe("not_owner");
    expect(
      getReviewBlockReason(
        null,
        { parentId: "p1", status: "fulfilled" },
        fresh,
      ),
    ).toBe("not_owner");
  });

  // One per application, so a single family can't flood a public page.
  it("refuses a second review for the same application", () => {
    expect(
      getReviewBlockReason(
        parent,
        { parentId: "p1", status: "fulfilled" },
        { alreadyReviewed: true },
      ),
    ).toBe("already_reviewed");
  });

  // Ownership is checked before completeness, so a stranger is told the real
  // reason rather than learning the application's status.
  it("reports ownership before status", () => {
    expect(
      getReviewBlockReason(other, { parentId: "p1", status: "draft" }, fresh),
    ).toBe("not_owner");
  });
});

describe("canModerateReviews", () => {
  it("is admin-only — publishing puts words on a public page", () => {
    expect(canModerateReviews(admin)).toBe(true);
    expect(canModerateReviews(parent)).toBe(false);
    expect(canModerateReviews(null)).toBe(false);
  });
});
