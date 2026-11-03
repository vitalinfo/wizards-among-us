import { describe, expect, it } from "vitest";

import { isUuid } from "../uuid";

describe("isUuid", () => {
  it("accepts the ids Postgres issues, in either case", () => {
    expect(isUuid("d75c6aa0-d3c3-468b-bffa-6ca82a25a1da")).toBe(true);
    expect(isUuid("D75C6AA0-D3C3-468B-BFFA-6CA82A25A1DA")).toBe(true);
  });

  it("rejects what a scanner puts in the id segment", () => {
    expect(isUuid("index.php")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("d75c6aa0-d3c3-468b-bffa-6ca82a25a1da/../x")).toBe(false);
    expect(isUuid(" d75c6aa0-d3c3-468b-bffa-6ca82a25a1da")).toBe(false);
    expect(isUuid("d75c6aa0-d3c3-468b-bffa-6ca82a25a1d")).toBe(false);
    expect(isUuid("g75c6aa0-d3c3-468b-bffa-6ca82a25a1da")).toBe(false);
  });
});
