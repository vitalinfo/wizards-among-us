import { createHash, createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { verifyTelegramLogin } from "../telegram";
import { TELEGRAM_RETURN_SCRIPT } from "../telegramReturnScript";

const TOKEN = "8959220961:test-secret";
const ORIGIN = "https://wizards-among-us.pp.ua";

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

// Runs the exact string the page ships, against a stand-in `location`, and
// returns where it sent the browser.
function run(hash: string, search = ""): string {
  const replace = vi.fn();
  new Function("location", TELEGRAM_RETURN_SCRIPT)({ hash, search, replace });
  expect(replace).toHaveBeenCalledTimes(1);
  return replace.mock.calls[0][0];
}

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

describe("TELEGRAM_RETURN_SCRIPT", () => {
  it("forwards a payload that still verifies, Cyrillic included", () => {
    const target = run(fragment(result));
    expect(target).toMatch(/^\/auth\/telegram\?/);

    const params = Object.fromEntries(new URL(target, ORIGIN).searchParams);
    expect(params.first_name).toBe("Софія");
    const verified = verifyTelegramLogin(params, TOKEN, {
      nowSeconds: () => Number(fields.auth_date),
    });
    expect(verified.ok).toBe(true);
  });

  it("forwards next from the page's query", () => {
    const target = run(fragment(result), "?next=%2Faccount%2Fparent");
    expect(new URL(target, ORIGIN).searchParams.get("next")).toBe(
      "/account/parent",
    );
  });

  it("goes back to /login, keeping next, when there is no auth result", () => {
    expect(run("")).toBe("/login");
    expect(run("#faq", "?next=%2Faccount")).toBe("/login?next=%2Faccount");
  });

  it("goes back to /login when the fragment is not a signed result", () => {
    expect(run("#tgAuthResult=%%%")).toBe("/login");
    expect(run(fragment(false))).toBe("/login");
    expect(run(fragment({ id: 1 }))).toBe("/login");
  });
});
