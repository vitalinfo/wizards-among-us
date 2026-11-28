import { describe, expect, it } from "vitest";

import {
  ALL_REVIEWS,
  isNarrowed,
  parseReviewGalleryFilter,
  parseReviewListFilter,
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

describe("parseReviewGalleryFilter", () => {
  it("accepts each gallery filter", () => {
    expect(parseReviewGalleryFilter("all")).toBe("all");
    expect(parseReviewGalleryFilter("in")).toBe("in");
    expect(parseReviewGalleryFilter("eligible")).toBe("eligible");
  });

  it("reads anything else as all", () => {
    expect(parseReviewGalleryFilter(undefined)).toBe("all");
    expect(parseReviewGalleryFilter("out")).toBe("all");
    expect(parseReviewGalleryFilter(["in"])).toBe("all");
  });
});

describe("parseReviewListFilter", () => {
  it("reads both filters from the search params", () => {
    expect(
      parseReviewListFilter({ status: "hidden", gallery: "eligible" }),
    ).toEqual({ status: "hidden", gallery: "eligible" });
  });

  // The actions re-parse what the client bound, so anything at all may arrive.
  it("reads a missing or malformed value as no filter", () => {
    for (const value of [undefined, null, "published", 3, []]) {
      expect(parseReviewListFilter(value)).toEqual(ALL_REVIEWS);
    }
    expect(parseReviewListFilter({ status: "nope", gallery: 1 })).toEqual(
      ALL_REVIEWS,
    );
  });
});

describe("isNarrowed", () => {
  it("is false only when both filters are all", () => {
    expect(isNarrowed(ALL_REVIEWS)).toBe(false);
    expect(isNarrowed({ status: "published", gallery: "all" })).toBe(true);
    expect(isNarrowed({ status: "all", gallery: "in" })).toBe(true);
  });
});

describe("reviewsHref", () => {
  it("leaves the defaults out of the url", () => {
    expect(reviewsHref(ALL_REVIEWS)).toBe("/admin/reviews");
  });

  it("carries a narrowed status and gallery filter", () => {
    expect(reviewsHref({ status: "hidden", gallery: "all" })).toBe(
      "/admin/reviews?status=hidden",
    );
    expect(reviewsHref({ status: "all", gallery: "eligible" })).toBe(
      "/admin/reviews?gallery=eligible",
    );
  });

  it("carries a page past the first, with or without filters", () => {
    expect(reviewsHref(ALL_REVIEWS, 1)).toBe("/admin/reviews");
    expect(reviewsHref(ALL_REVIEWS, 2)).toBe("/admin/reviews?page=2");
    expect(reviewsHref({ status: "published", gallery: "in" }, 3)).toBe(
      "/admin/reviews?status=published&gallery=in&page=3",
    );
  });

  // The actions redirect through both: whatever the client bound, it lands
  // on our own list.
  it("never leaves the reviews list for an unexpected value", () => {
    expect(
      reviewsHref(
        parseReviewListFilter({
          status: "//evil.example",
          gallery: "?x=1",
        }),
      ),
    ).toBe("/admin/reviews");
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
