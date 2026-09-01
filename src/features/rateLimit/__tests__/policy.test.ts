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
  // Heroku terminates TLS at its router, so the dyno never sees the real peer.
  // The chain is "client, proxy1, proxy2" — later entries are our own
  // infrastructure, so taking anything but the first would rate-limit Heroku.
  it("takes the first entry of x-forwarded-for", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-forwarded-for": " 203.0.113.7 " }))).toBe(
      "203.0.113.7",
    );
  });

  it("returns null when there is no usable address", () => {
    expect(clientIp(new Headers())).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBeNull();
    expect(
      clientIp(new Headers({ "x-forwarded-for": " , 10.0.0.1" })),
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
