import { describe, expect, it } from "vitest";

import { loginPathFor, safeReturnPath, signedOutRedirect } from "../returnPath";

// The return path comes from a query string, so it's attacker-controlled. An
// open redirect right after authentication is a phishing gift — the user has
// just proven they trust the page they're on.
describe("safeReturnPath", () => {
  it("keeps a same-origin path", () => {
    expect(safeReturnPath("/parent/applications")).toBe("/parent/applications");
    expect(safeReturnPath("/parent/applications/abc?x=1")).toBe(
      "/parent/applications/abc?x=1",
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

describe("loginPathFor", () => {
  it("encodes the destination", () => {
    expect(loginPathFor("/parent/applications")).toBe(
      "/login?next=%2Fparent%2Fapplications",
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
    expect(signedOutRedirect(null, "/parent/applications")).toBe(
      "/login?next=%2Fparent%2Fapplications",
    );
    expect(signedOutRedirect(undefined, "/parent/applications")).toBe(
      "/login?next=%2Fparent%2Fapplications",
    );
  });

  // The loop-breaker: never send an admin to a sign-in page they are past.
  it("sends an admin to their own panel, never back to /login", () => {
    const target = signedOutRedirect({ kind: "admin" }, "/parent/applications");
    expect(target).toBe("/admin");
    expect(target).not.toContain("/login");
  });

  // A user reaching this helper is a caller bug, but it must not loop either.
  it("still refuses a hostile destination", () => {
    expect(signedOutRedirect(null, "https://evil.com")).toBe("/login");
  });
});
