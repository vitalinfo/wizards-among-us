import { describe, expect, it } from "vitest";

import {
  parseReviewsPage,
  parseReviewStatusFilter,
  reviewsHref,
  reviewsPageCount,
} from "../listFilter";

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

  it("carries a page past the first, with or without a status", () => {
    expect(reviewsHref("all", 1)).toBe("/admin/reviews");
    expect(reviewsHref("all", 2)).toBe("/admin/reviews?page=2");
    expect(reviewsHref("published", 3)).toBe(
      "/admin/reviews?status=published&page=3",
    );
  });

  // The publish action redirects through both: whatever the client bound,
  // it lands on our own list.
  it("never leaves the reviews list for an unexpected value", () => {
    expect(reviewsHref(parseReviewStatusFilter("//evil.example"))).toBe(
      "/admin/reviews",
    );
  });
});

describe("parseReviewsPage", () => {
  it("accepts a positive whole number", () => {
    expect(parseReviewsPage("1")).toBe(1);
    expect(parseReviewsPage("7")).toBe(7);
    expect(parseReviewsPage(4)).toBe(4);
  });

  // A bad page number must never be able to blank the list.
  it("reads anything else as the first page", () => {
    for (const value of [undefined, "", "0", "-2", "1.5", "two", ["2"], NaN]) {
      expect(parseReviewsPage(value)).toBe(1);
    }
  });
});

describe("reviewsPageCount", () => {
  it("is at least one page, even with nothing to show", () => {
    expect(reviewsPageCount(0)).toBe(1);
  });

  it("rounds a partial page up", () => {
    expect(reviewsPageCount(50)).toBe(1);
    expect(reviewsPageCount(51)).toBe(2);
    expect(reviewsPageCount(120)).toBe(3);
  });
});
