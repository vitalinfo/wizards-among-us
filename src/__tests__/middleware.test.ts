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

  // Next's own fetch of a server action's redirect target, carrying the
  // visitor's session. Redirected, fetch drops the cookie on the way to the
  // public host and the page renders signed-out.
  it("lets the app's own requests to itself through, whatever the host rule", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    for (const host of ["localhost:9652", "127.0.0.1:9652", "[::1]:9652"]) {
      for (const proto of ["https", "http"]) {
        const response = middleware(
          request(`http://${host}/account/parent/applications`, {
            "x-forwarded-proto": proto,
            host,
            cookie: "wau_session=abc",
          }),
        );
        expect(response.status, `${proto} ${host}`).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    }
  });

  // Only the dyno itself: a look-alike host is still sent to the canonical one.
  it("does not treat a host that merely starts with localhost as loopback", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    for (const host of ["localhost.evil.example", "127.0.0.1.nip.io"]) {
      const response = middleware(
        request(`https://${host}/`, { "x-forwarded-proto": "https", host }),
      );
      expect(response.status, host).toBe(307);
    }
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

// Staging serves the same build as production, landing `index, follow` included.
describe("middleware and search indexing", () => {
  it("leaves production indexable", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "wizards-among-us.pp.ua");
    const response = middleware(
      request("https://wizards-among-us.pp.ua/", {
        "x-forwarded-proto": "https",
        host: "wizards-among-us.pp.ua",
      }),
    );
    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("keeps every other host out of the index, the landing included", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    const response = middleware(
      request("https://staging.wizards-among-us.pp.ua/", {
        "x-forwarded-proto": "https",
        host: "staging.wizards-among-us.pp.ua",
      }),
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("keeps a host out of the index when CANONICAL_HOST is unset", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "");
    const response = middleware(
      request("https://wau-staging.herokuapp.com/", {
        "x-forwarded-proto": "https",
        host: "wau-staging.herokuapp.com",
      }),
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});

describe("middleware in maintenance mode", () => {
  it("serves every route as the maintenance screen, with a 503", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MAINTENANCE_MODE", "true");
    for (const path of ["/", "/parent?x=1", "/api/files/abc"]) {
      const response = middleware(request(`http://localhost:3000${path}`));
      expect(response.status, path).toBe(503);
      expect(response.headers.get("x-middleware-rewrite"), path).toBe(
        "http://localhost:3000/maintenance",
      );
    }
  });

  it("still upgrades http to https first in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MAINTENANCE_MODE", "true");
    const response = middleware(
      request("http://wau-staging.herokuapp.com/login", {
        "x-forwarded-proto": "http",
        host: "wau-staging.herokuapp.com",
      }),
    );
    expect(response.status).toBe(308);
  });

  it("keeps HSTS on the maintenance response in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MAINTENANCE_MODE", "1");
    vi.stubEnv("CANONICAL_HOST", "staging.wizards-among-us.pp.ua");
    const response = middleware(
      request("https://staging.wizards-among-us.pp.ua/", {
        "x-forwarded-proto": "https",
        host: "staging.wizards-among-us.pp.ua",
      }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("strict-transport-security")).toBe(
      "max-age=31536000",
    );
  });

  it("is off unless the variable is set to true or 1", () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const value of ["", "0", "false", "off"]) {
      vi.stubEnv("MAINTENANCE_MODE", value);
      const response = middleware(request("http://localhost:3000/"));
      expect(response.status, value).toBe(200);
      expect(response.headers.get("x-middleware-rewrite"), value).toBeNull();
    }
  });
});

// A layout is never told its url, so the middleware hands the /account layout
// the path that was asked for — otherwise a signed-out deep link signs in to
// the account's front page instead of the page it opened.
describe("middleware and the request path", () => {
  // Next forwards request-header overrides to the app this way.
  function forwardedPath(response: Response): string | null {
    return response.headers.get("x-middleware-request-x-request-path");
  }

  it("forwards the path and query in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CANONICAL_HOST", "wizards-among-us.pp.ua");
    const response = middleware(
      request(
        "https://wizards-among-us.pp.ua/account/parent/applications/abc/view?x=1",
        { "x-forwarded-proto": "https", host: "wizards-among-us.pp.ua" },
      ),
    );
    expect(forwardedPath(response)).toBe(
      "/account/parent/applications/abc/view?x=1",
    );
  });

  it("forwards it outside production and on loopback too", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(
      forwardedPath(
        middleware(request("http://localhost:3003/account/parent")),
      ),
    ).toBe("/account/parent");

    vi.stubEnv("NODE_ENV", "production");
    expect(
      forwardedPath(
        middleware(
          request("http://localhost:9652/account/volunteer", {
            host: "localhost:9652",
          }),
        ),
      ),
    ).toBe("/account/volunteer");
  });

  it("overwrites a value the client sent under the same name", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = middleware(
      request("http://localhost:3003/account/parent", {
        "x-request-path": "/account/somewhere-else",
      }),
    );
    expect(forwardedPath(response)).toBe("/account/parent");
  });
});
