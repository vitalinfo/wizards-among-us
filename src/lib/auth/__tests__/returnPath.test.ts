import { describe, expect, it } from "vitest";

import { loginPathFor, safeReturnPath } from "../returnPath";

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
