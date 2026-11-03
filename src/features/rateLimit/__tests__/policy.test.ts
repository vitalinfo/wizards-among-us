import { describe, expect, it } from "vitest";

import { clientIp, RATE_LIMITS, rateLimitKey } from "../policy";

describe("rateLimitKey", () => {
  // The action prefix stops a login attempt consuming a submit allowance, and
  // the kind stops a user id ever colliding with an address.
  it("scopes by action and identifier kind", () => {
    expect(rateLimitKey("adminLogin", { kind: "ip", value: "1.2.3.4" })).toBe(
      "adminLogin:ip:1.2.3.4",
    );
    expect(rateLimitKey("claim", { kind: "user", value: "1.2.3.4" })).toBe(
      "claim:user:1.2.3.4",
    );
    expect(rateLimitKey("adminLogin", { kind: "ip", value: "u1" })).not.toBe(
      rateLimitKey("adminLogin", { kind: "user", value: "u1" }),
    );
  });
});

describe("clientIp", () => {
  // Heroku's router APPENDS the address it saw to whatever the client sent, so
  // only the last entry is not the client's own text.
  it("takes the entry the router appended, not one the client sent", () => {
    expect(
      clientIp(
        new Headers({ "x-forwarded-for": "198.51.100.77, 203.0.113.7" }),
      ),
    ).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.7 " }))).toBe(
      "203.0.113.7",
    );
  });

  it("returns null when there is no usable address", () => {
    expect(clientIp(new Headers())).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBeNull();
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, " })),
    ).toBeNull();
  });
});

describe("policies", () => {
  it("keeps the admin password gate the tightest", () => {
    // The only password in the system; guessing must be impractical.
    expect(RATE_LIMITS.adminLogin.limit).toBeLessThanOrEqual(5);
    expect(RATE_LIMITS.adminLogin.windowSeconds).toBeGreaterThanOrEqual(600);
  });

  it("leaves honest use unaffected", () => {
    // A parent filing for three children in one sitting, and a volunteer
    // claiming several, must never see a limiter.
    expect(RATE_LIMITS.applicationSubmit.limit).toBeGreaterThanOrEqual(5);
    expect(RATE_LIMITS.claim.limit).toBeGreaterThanOrEqual(10);
  });

  it("has a positive window for every action", () => {
    for (const policy of Object.values(RATE_LIMITS)) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
    }
  });
});
