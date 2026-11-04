import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { encodePendingLogin } from "@/lib/auth/telegramOidc";

// The user lookup and the session row are database writes, and the code
// exchange is a call to Telegram (both covered in telegramOidc.test.ts). What
// is under test is how the route checks the round trip and where it sends the
// browser.
const findOrCreateTelegramUser = vi.fn(async () => "user-1");
vi.mock("@/lib/auth/telegramUser", () => ({
  findOrCreateTelegramUser: (...args: unknown[]) =>
    findOrCreateTelegramUser(...(args as [])),
}));
vi.mock("@/lib/auth/session", () => ({
  SESSION_COOKIE_NAME: "session",
  createSessionRecord: async () => ({
    token: "session-token",
    expiresAt: new Date(Date.now() + 86_400_000),
  }),
  sessionCookieOptions: (expires: Date) => ({ path: "/", expires }),
}));
const exchangeCode = vi.fn();
const profileFromIdToken = vi.fn();
vi.mock("@/lib/auth/telegramOidc", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/telegramOidc")>()),
  exchangeCode: (...args: unknown[]) => exchangeCode(...args),
  profileFromIdToken: (...args: unknown[]) => profileFromIdToken(...args),
}));

import { GET } from "../route";

const PROFILE = { id: "419335961", firstName: "Віталій", authDate: 1 };
const pending = {
  state: "state-1",
  verifier: "verifier-1",
  next: "/account/parent",
};

function callback(
  query: string,
  cookie: string | null = encodePendingLogin(pending),
) {
  return GET(
    new NextRequest(`http://localhost:3003/auth/telegram/callback${query}`, {
      headers: {
        host: "staging.wizards-among-us.pp.ua",
        "x-forwarded-proto": "https",
        ...(cookie ? { cookie: `tg_login=${cookie}` } : {}),
      },
    }),
  );
}

function expectCookieCleared(
  response: Response & {
    cookies: {
      get(name: string): { maxAge?: number; path?: string } | undefined;
    };
  },
) {
  const cleared = response.cookies.get("tg_login");
  expect(cleared?.maxAge).toBe(0);
  expect(cleared?.path).toBe("/auth/telegram");
}

beforeEach(() => {
  vi.stubEnv("TELEGRAM_CLIENT_ID", "8959220961");
  vi.stubEnv("TELEGRAM_CLIENT_SECRET", "s3cret");
  exchangeCode.mockResolvedValue("id-token");
  profileFromIdToken.mockResolvedValue(PROFILE);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /auth/telegram/callback", () => {
  it("signs in and lands where the login started from", async () => {
    const response = await callback("?code=code-1&state=state-1");

    expect(response.headers.get("location")).toBe("/account/parent");
    expect(response.cookies.get("session")?.value).toBe("session-token");
    expectCookieCleared(response);
    expect(exchangeCode).toHaveBeenCalledWith({
      client: { clientId: "8959220961", clientSecret: "s3cret" },
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri:
        "https://staging.wizards-among-us.pp.ua/auth/telegram/callback",
    });
    expect(profileFromIdToken).toHaveBeenCalledWith("id-token", "8959220961");
    expect(findOrCreateTelegramUser).toHaveBeenCalledWith(PROFILE);
  });

  it("refuses a state that does not match the cookie", async () => {
    const response = await callback("?code=code-1&state=someone-elses");
    expect(response.headers.get("location")).toBe("/?login=failed");
    expect(response.cookies.get("session")).toBeUndefined();
    expect(exchangeCode).not.toHaveBeenCalled();
    expectCookieCleared(response);
  });

  it("starts over when no login is in progress", async () => {
    const response = await callback("?code=code-1&state=state-1", null);
    expect(response.headers.get("location")).toBe("/login");
    expect(exchangeCode).not.toHaveBeenCalled();
  });

  it("goes back to the login page, keeping next, when declined", async () => {
    const response = await callback("?error=access_denied&state=state-1");
    expect(response.headers.get("location")).toBe(
      "/login?next=%2Faccount%2Fparent",
    );
    expect(exchangeCode).not.toHaveBeenCalled();
    expectCookieCleared(response);
  });

  it("fails without a session when Telegram's answer does not verify", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    profileFromIdToken.mockRejectedValue(new Error("no numeric id"));

    const response = await callback("?code=code-1&state=state-1");

    expect(response.headers.get("location")).toBe("/?login=failed");
    expect(response.cookies.get("session")).toBeUndefined();
    expect(findOrCreateTelegramUser).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      "Telegram login failed:",
      "no numeric id",
    );
    expectCookieCleared(response);
  });

  it("never lands off-site, whatever the cookie says", async () => {
    const response = await callback(
      "?code=code-1&state=state-1",
      encodePendingLogin({ ...pending, next: "//evil.example" }),
    );
    expect(response.headers.get("location")).toBe("/account");
  });
});
