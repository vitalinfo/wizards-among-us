import { describe, expect, it } from "vitest";

import { parseReviewStatusFilter, reviewsHref } from "../listFilter";

describe("parseReviewStatusFilter", () => {
  it("accepts each status", () => {
    expect(parseReviewStatusFilter("all")).toBe("all");
    expect(parseReviewStatusFilter("published")).toBe("published");
    expect(parseReviewStatusFilter("hidden")).toBe("hidden");
  });

  // A stale or mistyped link shows everything rather than an empty list.
  it("reads anything else as all", () => {
    expect(parseReviewStatusFilter(undefined)).toBe("all");
    expect(parseReviewStatusFilter("")).toBe("all");
    expect(parseReviewStatusFilter("Published")).toBe("all");
    expect(parseReviewStatusFilter(["published"])).toBe("all");
  });
});

describe("reviewsHref", () => {
  it("leaves the default out of the url", () => {
    expect(reviewsHref("all")).toBe("/admin/reviews");
  });

  it("carries a narrowed status", () => {
    expect(reviewsHref("hidden")).toBe("/admin/reviews?status=hidden");
  });

  // The publish action redirects through both: whatever the client bound,
  // it lands on our own list.
  it("never leaves the reviews list for an unexpected value", () => {
    expect(reviewsHref(parseReviewStatusFilter("//evil.example"))).toBe(
      "/admin/reviews",
    );
  });
});
