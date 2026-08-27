// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyTurnstile } from "../verify";

// This is the only spam defence on a public form that writes children's data,
// so its failure modes matter more than its happy path.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockSiteverify(success: boolean) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(JSON.stringify({ success }), { status: 200 }),
    );
}

describe("verifyTurnstile", () => {
  it("accepts a token Cloudflare confirms", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    mockSiteverify(true);
    expect(await verifyTurnstile("token")).toEqual({ ok: true });
  });

  it("rejects a token Cloudflare refuses", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    mockSiteverify(false);
    expect(await verifyTurnstile("token")).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  // A client that never rendered the widget just sends nothing.
  it("rejects a missing token without calling Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const fetchSpy = mockSiteverify(true);
    expect(await verifyTurnstile(null)).toEqual({
      ok: false,
      reason: "missing_token",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fails CLOSED when Cloudflare is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyTurnstile("token")).toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  // A missing secret in production means the captcha silently isn't running —
  // that must block, not wave traffic through.
  it("fails closed in production when the secret is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile("token")).toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("allows an unconfigured local checkout to keep working", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(null)).toEqual({ ok: true });
  });
});
