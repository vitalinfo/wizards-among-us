import { afterEach, describe, expect, it, vi } from "vitest";

import { parseAdminAllowlist, toAdminActor } from "../adminAllowlist";

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

describe("toAdminActor", () => {
  const admin = { id: "a1", email: "Ann@Example.com" };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the admin actor while the email is allowlisted", () => {
    vi.stubEnv("ADMIN_ALLOWLIST", "ann@example.com, bob@x.ua");
    expect(toAdminActor(admin)).toEqual({
      kind: "admin",
      id: "a1",
      email: "Ann@Example.com",
    });
  });

  it("returns null once the email is removed from the allowlist", () => {
    vi.stubEnv("ADMIN_ALLOWLIST", "bob@x.ua");
    expect(toAdminActor(admin)).toBeNull();
  });

  it("returns null when the allowlist is empty or unset", () => {
    vi.stubEnv("ADMIN_ALLOWLIST", "");
    expect(toAdminActor(admin)).toBeNull();
  });

  it("returns null when the admins row is gone", () => {
    vi.stubEnv("ADMIN_ALLOWLIST", "ann@example.com");
    expect(toAdminActor(undefined)).toBeNull();
  });
});
