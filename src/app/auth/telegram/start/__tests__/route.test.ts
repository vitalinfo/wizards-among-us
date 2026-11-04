import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /auth/telegram/start", () => {
  it("remembers next in a cookie and sends Telegram a query-free return_to", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "8959220961:test-secret");
    const response = start("?next=%2Faccount%2Fparent");

    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    expect(location.origin + location.pathname).toBe(
      "https://oauth.telegram.org/auth",
    );
    expect(location.searchParams.get("origin")).toBe(ORIGIN);
    expect(location.searchParams.get("return_to")).toBe(
      `${ORIGIN}/auth/telegram/return`,
    );

    const cookie = response.cookies.get("tg_next");
    expect(cookie?.value).toBe("/account/parent");
    expect(cookie?.path).toBe("/auth/telegram");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("never stores an off-site next", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "8959220961:test-secret");
    expect(
      start("?next=%2F%2Fevil.example").cookies.get("tg_next")?.value,
    ).toBe("/account");
    expect(start().cookies.get("tg_next")?.value).toBe("/account");
  });

  it("goes home with a notice when Telegram login is not configured", () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const response = start();
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/?login=misconfigured");
    expect(response.cookies.get("tg_next")).toBeUndefined();
  });
});
