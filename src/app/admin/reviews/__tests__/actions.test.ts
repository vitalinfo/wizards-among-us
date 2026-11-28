import { afterEach, describe, expect, it, vi } from "vitest";

// The query is the SQL guard and the session is the cookie; what is under test
// is the action's own decisions — who may call it, and when it writes the
// audit trail.
const calls = vi.hoisted(() => ({
  admin: true,
  changed: true,
  setInGallery: [] as Array<[string, boolean]>,
  audit: [] as Array<{ action: string; targetId: string }>,
}));

vi.mock("@/lib/auth/session", () => ({
  requireAdmin: async () => {
    if (!calls.admin) {
      throw new Error("NEXT_REDIRECT");
    }
    return { kind: "admin", id: "a1", email: "admin@example.com" };
  },
}));
vi.mock("@/features/reviews/queries", () => ({
  setReviewPublished: async () => {},
  setReviewInGallery: async (id: string, inGallery: boolean) => {
    calls.setInGallery.push([id, inGallery]);
    return calls.changed;
  },
}));
vi.mock("@/features/audit/log", () => ({
  recordAuditLog: async (entry: { action: string; targetId: string }) => {
    calls.audit.push({ action: entry.action, targetId: entry.targetId });
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));

import { setReviewInGalleryAction } from "../actions";

const REVIEW_ID = "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10";

afterEach(() => {
  calls.admin = true;
  calls.changed = true;
  calls.setInGallery = [];
  calls.audit = [];
});

describe("setReviewInGalleryAction", () => {
  it("adds the photo, logs it, and returns to the admin's list", async () => {
    await expect(
      setReviewInGalleryAction(
        REVIEW_ID,
        true,
        { status: "published", gallery: "eligible" },
        2,
      ),
    ).rejects.toThrow(
      "redirect:/admin/reviews?status=published&gallery=eligible&page=2",
    );

    expect(calls.setInGallery).toEqual([[REVIEW_ID, true]]);
    expect(calls.audit).toEqual([
      { action: "review.added_to_gallery", targetId: REVIEW_ID },
    ]);
  });

  it("logs a removal as its own event", async () => {
    await expect(setReviewInGalleryAction(REVIEW_ID, false)).rejects.toThrow(
      "redirect:/admin/reviews",
    );

    expect(calls.audit).toEqual([
      { action: "review.removed_from_gallery", targetId: REVIEW_ID },
    ]);
  });

  // Refused by the SQL guard (consent withdrawn since the page was drawn) or
  // already in that state: nothing was decided, so nothing is logged.
  it("logs nothing when no row changed", async () => {
    calls.changed = false;

    await expect(setReviewInGalleryAction(REVIEW_ID, true)).rejects.toThrow(
      "redirect:",
    );

    expect(calls.audit).toEqual([]);
  });

  it("refuses anyone who is not an admin, before writing", async () => {
    calls.admin = false;

    await expect(setReviewInGalleryAction(REVIEW_ID, true)).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(calls.setInGallery).toEqual([]);
    expect(calls.audit).toEqual([]);
  });
});
