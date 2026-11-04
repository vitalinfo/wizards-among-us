import { describe, expect, it } from "vitest";

import {
  accountReturnPath,
  afterLoginPath,
  loginPathFor,
  safeReturnPath,
  signedOutRedirect,
} from "../returnPath";

// The return path comes from a query string, so it's attacker-controlled. An
// open redirect right after authentication is a phishing gift — the user has
// just proven they trust the page they're on.
describe("safeReturnPath", () => {
  it("keeps a same-origin path", () => {
    expect(safeReturnPath("/account/parent/applications")).toBe(
      "/account/parent/applications",
    );
    expect(safeReturnPath("/account/parent/applications/abc?x=1")).toBe(
      "/account/parent/applications/abc?x=1",
    );
  });

  it("refuses anything that could leave the site", () => {
    for (const hostile of [
      "https://evil.com",
      "http://evil.com",
      "//evil.com", // protocol-relative — browsers treat this as absolute
      "/\\evil.com", // backslash variant
      "javascript:alert(1)",
      "evil.com",
    ]) {
      expect(safeReturnPath(hostile)).toBe("/");
    }
  });

  it("refuses control characters that could smuggle a header", () => {
    expect(safeReturnPath("/parent\nLocation: https://evil.com")).toBe("/");
    expect(safeReturnPath("/parent\r\nX: 1")).toBe("/");
  });

  // Bouncing back to /login after logging in would loop forever.
  it("refuses the auth routes themselves", () => {
    expect(safeReturnPath("/login")).toBe("/");
    expect(safeReturnPath("/login?next=/x")).toBe("/");
    expect(safeReturnPath("/auth/telegram")).toBe("/");
  });

  it("falls back for empty input", () => {
    expect(safeReturnPath(null)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
    expect(safeReturnPath("")).toBe("/");
  });
});

describe("afterLoginPath", () => {
  it("lands a sign-in with no destination in the account", () => {
    expect(afterLoginPath(undefined)).toBe("/account");
    expect(afterLoginPath("")).toBe("/account");
  });

  it("keeps the page the sign-in was sent from", () => {
    expect(afterLoginPath("/account/volunteer/children")).toBe(
      "/account/volunteer/children",
    );
  });

  it("sends a refused destination to the account too", () => {
    expect(afterLoginPath("https://evil.com")).toBe("/account");
    expect(afterLoginPath("/login")).toBe("/account");
  });
});

describe("loginPathFor", () => {
  it("encodes the destination", () => {
    expect(loginPathFor("/account/parent/applications")).toBe(
      "/login?next=%2Faccount%2Fparent%2Fapplications",
    );
  });

  it("omits the parameter when there's nowhere meaningful to return", () => {
    expect(loginPathFor("https://evil.com")).toBe("/login");
    expect(loginPathFor("/")).toBe("/login");
  });
});

// Regression: an admin holds a session but is NOT a user. Pages guarded with
// isUser bounced them to /login, and /login (which only asked "is there an
// actor?") bounced them straight back — an infinite redirect loop that shipped.
describe("signedOutRedirect", () => {
  it("sends a signed-out visitor to sign in, keeping their destination", () => {
    expect(signedOutRedirect(null, "/account/parent/applications")).toBe(
      "/login?next=%2Faccount%2Fparent%2Fapplications",
    );
    expect(signedOutRedirect(undefined, "/account/parent/applications")).toBe(
      "/login?next=%2Faccount%2Fparent%2Fapplications",
    );
  });

  // The loop-breaker: never send an admin to a sign-in page they are past.
  it("sends an admin to their own panel, never back to /login", () => {
    const target = signedOutRedirect(
      { kind: "admin" },
      "/account/parent/applications",
    );
    expect(target).toBe("/admin");
    expect(target).not.toContain("/login");
  });

  // A user reaching this helper is a caller bug, but it must not loop either.
  it("still refuses a hostile destination", () => {
    expect(signedOutRedirect(null, "https://evil.com")).toBe("/login");
  });
});

// The /account layout's guard runs before any page's, so the path it is handed
// decides where a signed-out deep link (a bot notification) lands after login.
describe("accountReturnPath", () => {
  it("keeps a deep link under /account, query string included", () => {
    expect(
      accountReturnPath("/account/parent/applications/4a69e2b0/view"),
    ).toBe("/account/parent/applications/4a69e2b0/view");
    expect(
      accountReturnPath("/account/volunteer/children?region=kyivska"),
    ).toBe("/account/volunteer/children?region=kyivska");
    expect(accountReturnPath("/account")).toBe("/account");
    expect(accountReturnPath("/account?x=1")).toBe("/account?x=1");
  });

  it("falls back to the account root when the header is missing", () => {
    expect(accountReturnPath(null)).toBe("/account");
    expect(accountReturnPath(undefined)).toBe("/account");
    expect(accountReturnPath("")).toBe("/account");
  });

  // The layout only renders under /account; anything else was not set by us.
  it("refuses anything outside /account", () => {
    for (const foreign of [
      "/admin",
      "/accounting",
      "/login?next=/account",
      "https://evil.com/account",
      "//evil.com/account",
    ]) {
      expect(accountReturnPath(foreign), foreign).toBe("/account");
    }
  });

  it("becomes a sign-in url that returns to the deep link", () => {
    expect(
      signedOutRedirect(
        null,
        accountReturnPath("/account/parent/applications/4a69e2b0/view?tab=1"),
      ),
    ).toBe(
      "/login?next=%2Faccount%2Fparent%2Fapplications%2F4a69e2b0%2Fview%3Ftab%3D1",
    );
    expect(signedOutRedirect(null, accountReturnPath(null))).toBe(
      "/login?next=%2Faccount",
    );
  });

  it("still sends an admin to their own panel", () => {
    expect(
      signedOutRedirect(
        { kind: "admin" },
        accountReturnPath("/account/parent"),
      ),
    ).toBe("/admin");
  });
});
