import { describe, expect, it } from "vitest";

import { parseAdminAllowlist } from "../adminAllowlist";

describe("parseAdminAllowlist", () => {
  it("returns an empty set for empty/undefined input", () => {
    expect(parseAdminAllowlist(undefined).size).toBe(0);
    expect(parseAdminAllowlist("").size).toBe(0);
    expect(parseAdminAllowlist("  ,  ,").size).toBe(0);
  });

  it("splits, trims, and lowercases emails", () => {
    const set = parseAdminAllowlist(" Ann@Example.com , bob@x.ua ");
    expect(set.has("ann@example.com")).toBe(true);
    expect(set.has("bob@x.ua")).toBe(true);
    expect(set.size).toBe(2);
  });
});
