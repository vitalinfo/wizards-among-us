import { describe, expect, it } from "vitest";

import {
  parsePublicReviewsQuery,
  publicReviewsHref,
  REVIEWS_PAGE_SIZE,
} from "../publicQuery";

describe("parsePublicReviewsQuery", () => {
  it("defaults to the first page at the design's five", () => {
    expect(parsePublicReviewsQuery({})).toEqual({ page: 1, per: 5 });
    expect(REVIEWS_PAGE_SIZE).toBe(5);
  });

  it("reads a page and an allowed size", () => {
    expect(parsePublicReviewsQuery({ page: "3", per: "20" })).toEqual({
      page: 3,
      per: 20,
    });
  });

  // The size reaches the database as a LIMIT, and the page as an OFFSET.
  it("falls back on anything it does not accept", () => {
    expect(parsePublicReviewsQuery({ page: "-2", per: "100000" })).toEqual({
      page: 1,
      per: 5,
    });
    expect(parsePublicReviewsQuery({ page: "1.5", per: "abc" })).toEqual({
      page: 1,
      per: 5,
    });
  });
});

describe("publicReviewsHref", () => {
  it("omits the defaults", () => {
    expect(publicReviewsHref()).toBe("/reviews");
    expect(publicReviewsHref({ page: 1, per: 5 })).toBe("/reviews");
  });

  it("carries a later page and a chosen size", () => {
    expect(publicReviewsHref({ page: 2, per: 10 })).toBe(
      "/reviews?page=2&per=10",
    );
  });
});
