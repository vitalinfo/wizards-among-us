import { describe, expect, it } from "vitest";

import {
  DEFAULT_PAGE_SIZE,
  pageCount,
  PAGE_SIZES,
  parsePageSize,
} from "../pageSize";

describe("parsePageSize", () => {
  it("accepts the sizes the picker offers", () => {
    for (const size of PAGE_SIZES) {
      expect(parsePageSize(String(size))).toBe(size);
    }
  });

  // The size becomes a LIMIT. A hand-edited url must not turn a page into
  // the whole list, or into nothing.
  it("falls back to the default for anything else", () => {
    for (const value of [
      undefined,
      "",
      "0",
      "-5",
      "7",
      "100000",
      "10.5",
      "ten",
    ]) {
      expect(parsePageSize(value)).toBe(DEFAULT_PAGE_SIZE);
    }
    expect(DEFAULT_PAGE_SIZE).toBe(10);
  });
});

describe("pageCount", () => {
  it("is never zero, so «page 1 of 0» cannot be rendered", () => {
    expect(pageCount(0, 10)).toBe(1);
  });

  it("rounds up by the chosen size", () => {
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(11, 5)).toBe(3);
    expect(pageCount(57, 20)).toBe(3);
  });
});
