import { describe, expect, it } from "vitest";

import { telegramAuthUrl } from "../telegramLogin";

const TOKEN = "8959220961:test-secret";
const ORIGIN = "https://staging.wizards-among-us.pp.ua";

describe("telegramAuthUrl", () => {
  it("points at Telegram's auth page with the bot id, never the secret", () => {
    const url = new URL(
      telegramAuthUrl({ botToken: TOKEN, origin: ORIGIN, returnTo: "/" })!,
    );
    expect(url.origin + url.pathname).toBe("https://oauth.telegram.org/auth");
    expect(url.searchParams.get("bot_id")).toBe("8959220961");
    expect(url.searchParams.get("origin")).toBe(ORIGIN);
    expect(url.searchParams.get("request_access")).toBe("write");
    expect(url.searchParams.get("return_to")).toBe(
      `${ORIGIN}/auth/telegram/return`,
    );
    expect(url.toString()).not.toContain("test-secret");
  });

  it("carries the return path through Telegram as ?next=", () => {
    const url = new URL(
      telegramAuthUrl({
        botToken: TOKEN,
        origin: ORIGIN,
        returnTo: "/account/parent",
      })!,
    );
    expect(url.searchParams.get("return_to")).toBe(
      `${ORIGIN}/auth/telegram/return?next=%2Faccount%2Fparent`,
    );
  });

  it("returns null for a token without a numeric bot id", () => {
    expect(
      telegramAuthUrl({ botToken: "garbage", origin: ORIGIN, returnTo: "/" }),
    ).toBeNull();
  });
});
