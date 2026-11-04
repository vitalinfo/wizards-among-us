import { createHash, createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The user lookup and the session row are database writes; what is under test
// is where the route sends the browser and what it does with the cookies.
vi.mock("@/lib/auth/telegramUser", () => ({
  findOrCreateTelegramUser: async () => "user-1",
}));
vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "session",
  createSessionRecord: async () => ({
    token: "session-token",
    expiresAt: new Date(Date.now() + 86_400_000),
  }),
  sessionCookieOptions: (expires: Date) => ({ path: "/", expires }),
}));

import { GET } from "../route";

const TOKEN = "8959220961:test-secret";

function signed(): Record<string, string> {
  const fields: Record<string, string> = {
    id: "1068482943",
    first_name: "Софія",
    auth_date: String(Math.floor(Date.now() / 1000)),
  };
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(TOKEN).digest();
  return {
    ...fields,
    hash: createHmac("sha256", secret).update(checkString).digest("hex"),
  };
}

function callback(params: Record<string, string>, nextCookie?: string) {
  return GET(
    new NextRequest(
      `http://localhost:3003/auth/telegram?${new URLSearchParams(params)}`,
      { headers: nextCookie ? { cookie: `tg_next=${nextCookie}` } : {} },
    ),
  );
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_BOT_TOKEN", TOKEN);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /auth/telegram", () => {
  it("signs in and lands on the path from the cookie, then drops it", async () => {
    const response = await callback(signed(), "%2Faccount%2Fparent");

    expect(response.headers.get("location")).toBe("/account/parent");
    expect(response.cookies.get("session")?.value).toBe("session-token");
    const cleared = response.cookies.get("tg_next");
    expect(cleared?.value).toBe("");
    expect(cleared?.path).toBe("/auth/telegram");
    expect(cleared?.maxAge).toBe(0);
  });

  it("lands on /account with no cookie, and never off-site", async () => {
    expect((await callback(signed())).headers.get("location")).toBe("/account");
    expect(
      (await callback(signed(), "%2F%2Fevil.example")).headers.get("location"),
    ).toBe("/account");
  });

  it("prefers a next query param, from a login started before the cookie", async () => {
    const response = await callback(
      { ...signed(), next: "/account/volunteer" },
      "%2Faccount%2Fparent",
    );
    expect(response.headers.get("location")).toBe("/account/volunteer");
  });

  it("refuses a bad signature and still drops the cookie", async () => {
    const response = await callback(
      { ...signed(), first_name: "Інша" },
      "%2Faccount%2Fparent",
    );
    expect(response.headers.get("location")).toBe("/?login=failed");
    expect(response.cookies.get("session")).toBeUndefined();
    expect(response.cookies.get("tg_next")?.maxAge).toBe(0);
  });
});
