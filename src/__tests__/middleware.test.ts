// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { middleware } from "../middleware";

// This is what guarantees the session cookie (Secure in production) is never
// dropped by a plain-http request, so it gets direct allow/redirect coverage.

function request(
  url: string,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware outside production", () => {
  it("never redirects, so local http://localhost dev keeps working", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = middleware(
      request("http://localhost:3000/login", {
        "x-forwarded-proto": "http",
        host: "localhost:3000",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("middleware in production", () => {
  it("upgrades http to https with a permanent redirect, preserving the path", () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = middleware(
      request("http://wau-staging.herokuapp.com/login", {
        "x-forwarded-proto": "http",
        host: "wau-staging.herokuapp.com",
      }),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://wau-staging.herokuapp.com/login",
    );
  });

  it("sends a request on the wrong host to the canonical one (temporary)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    const response = middleware(
      request("https://wau-staging.herokuapp.com/parent", {
        "x-forwarded-proto": "https",
        host: "wau-staging.herokuapp.com",
      }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://staging.wizards-among-us.pp.ua/parent",
    );
  });

  it("passes through on https + the canonical host, and sets HSTS", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    const response = middleware(
      request("https://staging.wizards-among-us.pp.ua/", {
        "x-forwarded-proto": "https",
        host: "staging.wizards-among-us.pp.ua",
      }),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
  });

  it("accepts any host when CANONICAL_HOST is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "");
    const response = middleware(
      request("https://wau-staging.herokuapp.com/", {
        "x-forwarded-proto": "https",
        host: "wau-staging.herokuapp.com",
      }),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
  });
});
