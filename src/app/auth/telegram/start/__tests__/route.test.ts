import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { decodePendingLogin, pkceChallenge } from "@/lib/auth/telegramOidc";

import { GET } from "../route";

const ORIGIN = "https://staging.wizards-among-us.pp.ua";

function start(query = "") {
  return GET(
    new NextRequest(`http://localhost:3003/auth/telegram/start${query}`, {
      headers: {
        host: "staging.wizards-among-us.pp.ua",
        "x-forwarded-proto": "https",
      },
    }),
  );
}

function configure() {
  vi.stubEnv("TELEGRAM_CLIENT_ID", "8959220961");
  vi.stubEnv("TELEGRAM_CLIENT_SECRET", "s3cret");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /auth/telegram/start", () => {
  it("sends the browser to Telegram and remembers the login in a cookie", () => {
    configure();
    const response = start("?next=%2Faccount%2Fparent");

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(
      "https://oauth.telegram.org/auth",
    );
    expect(location.searchParams.get("client_id")).toBe("8959220961");
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}/auth/telegram/callback`,
    );
    expect(response.headers.get("location")).not.toContain("s3cret");

    const cookie = response.cookies.get("tg_login");
    expect(cookie?.path).toBe("/auth/telegram");
    expect(cookie?.httpOnly).toBe(true);
    const pending = decodePendingLogin(cookie?.value);
    expect(pending?.next).toBe("/account/parent");
    // The cookie holds what Telegram was asked to match.
    expect(location.searchParams.get("state")).toBe(pending?.state);
    expect(location.searchParams.get("code_challenge")).toBe(
      pkceChallenge(pending!.verifier),
    );
  });

  it("uses a fresh state and verifier every time", () => {
    configure();
    const a = decodePendingLogin(start().cookies.get("tg_login")?.value);
    const b = decodePendingLogin(start().cookies.get("tg_login")?.value);
    expect(a?.state).not.toBe(b?.state);
    expect(a?.verifier).not.toBe(b?.verifier);
  });

  it("never stores an off-site next", () => {
    configure();
    const pending = (query: string) =>
      decodePendingLogin(start(query).cookies.get("tg_login")?.value)?.next;
    expect(pending("?next=%2F%2Fevil.example")).toBe("/account");
    expect(pending("")).toBe("/account");
  });

  it("goes home with a notice when Telegram login is not configured", () => {
    vi.stubEnv("TELEGRAM_CLIENT_ID", "8959220961");
    vi.stubEnv("TELEGRAM_CLIENT_SECRET", "");
    const response = start();
    expect(response.headers.get("location")).toBe("/?login=misconfigured");
    expect(response.cookies.get("tg_login")).toBeUndefined();
  });
});
