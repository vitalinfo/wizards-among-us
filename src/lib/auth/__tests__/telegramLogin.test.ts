import { createHash, createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyTelegramLogin } from "../telegram";
import { authCallbackFromFragment, telegramAuthUrl } from "../telegramLogin";

const TOKEN = "8959220961:test-secret";
const ORIGIN = "https://staging.wizards-among-us.pp.ua";

function sign(fields: Record<string, string>): string {
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(TOKEN).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
}

// What Telegram appends to return_to: base64url JSON, unpadded.
function fragment(data: unknown): string {
  return `#tgAuthResult=${Buffer.from(JSON.stringify(data)).toString("base64url")}`;
}

describe("telegramAuthUrl", () => {
  it("points at Telegram's auth page with the bot id, never the secret", () => {
    const url = new URL(
      telegramAuthUrl({ botToken: TOKEN, origin: ORIGIN, returnTo: "/" })!,
    );
    expect(url.origin + url.pathname).toBe("https://oauth.telegram.org/auth");
    expect(url.searchParams.get("bot_id")).toBe("8959220961");
    expect(url.searchParams.get("origin")).toBe(ORIGIN);
    expect(url.searchParams.get("request_access")).toBe("write");
    expect(url.searchParams.get("return_to")).toBe(`${ORIGIN}/login`);
    expect(url.toString()).not.toContain("test-secret");
  });

  it("carries the return path through Telegram as /login?next=", () => {
    const url = new URL(
      telegramAuthUrl({
        botToken: TOKEN,
        origin: ORIGIN,
        returnTo: "/account/parent",
      })!,
    );
    expect(url.searchParams.get("return_to")).toBe(
      `${ORIGIN}/login?next=%2Faccount%2Fparent`,
    );
  });

  it("returns null for a token without a numeric bot id", () => {
    expect(
      telegramAuthUrl({ botToken: "garbage", origin: ORIGIN, returnTo: "/" }),
    ).toBeNull();
  });
});

describe("authCallbackFromFragment", () => {
  const fields = {
    id: "1068482943",
    first_name: "Софія",
    username: "sofia",
    auth_date: "1793741870",
  };
  // Telegram sends numbers as numbers; the signature is over their strings.
  const result = {
    ...fields,
    id: Number(fields.id),
    auth_date: Number(fields.auth_date),
    hash: sign(fields),
  };

  it("builds a callback whose payload still verifies, Cyrillic included", () => {
    const callback = authCallbackFromFragment(fragment(result), "");
    expect(callback).toMatch(/^\/auth\/telegram\?/);

    const params = Object.fromEntries(new URL(callback!, ORIGIN).searchParams);
    expect(params.first_name).toBe("Софія");
    const verified = verifyTelegramLogin(params, TOKEN, {
      nowSeconds: () => Number(fields.auth_date),
    });
    expect(verified.ok).toBe(true);
  });

  it("forwards next from the page's query", () => {
    const callback = authCallbackFromFragment(
      fragment(result),
      "?next=%2Faccount%2Fparent",
    );
    expect(new URL(callback!, ORIGIN).searchParams.get("next")).toBe(
      "/account/parent",
    );
  });

  it("ignores a page with no auth result", () => {
    expect(authCallbackFromFragment("", "")).toBeNull();
    expect(authCallbackFromFragment("#faq", "")).toBeNull();
  });

  it("ignores a fragment that is not a signed result", () => {
    expect(authCallbackFromFragment("#tgAuthResult=%%%", "")).toBeNull();
    expect(authCallbackFromFragment(fragment(false), "")).toBeNull();
    expect(authCallbackFromFragment(fragment({ id: 1 }), "")).toBeNull();
  });
});
