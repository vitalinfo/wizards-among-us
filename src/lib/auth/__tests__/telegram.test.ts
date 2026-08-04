import { createHash, createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyTelegramLogin } from "../telegram";

const TOKEN = "123456:test-bot-token";
const NOW = 1_700_000_000; // fixed clock (unix seconds)
const at = () => NOW;

// Sign a payload exactly the way Telegram's Login Widget does, so tests can
// build genuinely-valid inputs.
function sign(fields: Record<string, string>, token: string): string {
  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
}
function payload(
  fields: Record<string, string>,
  token = TOKEN,
): Record<string, string> {
  return { ...fields, hash: sign(fields, token) };
}

const validFields = {
  id: "42",
  first_name: "Olena",
  username: "olena_m",
  auth_date: String(NOW),
};

describe("verifyTelegramLogin", () => {
  it("accepts a correctly-signed, fresh payload and parses the profile", () => {
    const result = verifyTelegramLogin(payload(validFields), TOKEN, {
      nowSeconds: at,
    });
    expect(result).toEqual({
      ok: true,
      profile: {
        id: "42",
        firstName: "Olena",
        username: "olena_m",
        lastName: undefined,
        photoUrl: undefined,
        authDate: NOW,
      },
    });
  });

  it("rejects a tampered field (hash no longer matches)", () => {
    const p = payload(validFields);
    p.first_name = "Ivan"; // change data after signing
    expect(verifyTelegramLogin(p, TOKEN, { nowSeconds: at })).toEqual({
      ok: false,
      reason: "bad_hash",
    });
  });

  it("rejects a payload signed with a different bot token", () => {
    expect(
      verifyTelegramLogin(payload(validFields, "other-token"), TOKEN, {
        nowSeconds: at,
      }),
    ).toEqual({ ok: false, reason: "bad_hash" });
  });

  it("rejects a missing hash", () => {
    expect(
      verifyTelegramLogin({ ...validFields }, TOKEN, { nowSeconds: at }),
    ).toEqual({ ok: false, reason: "missing_hash" });
  });

  it("rejects a stale payload (replay protection)", () => {
    const stale = { ...validFields, auth_date: String(NOW - 2 * 86_400) };
    expect(
      verifyTelegramLogin(payload(stale), TOKEN, { nowSeconds: at }),
    ).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a well-signed but malformed payload (no id)", () => {
    const noId = { first_name: "X", auth_date: String(NOW) };
    expect(
      verifyTelegramLogin(payload(noId), TOKEN, { nowSeconds: at }),
    ).toEqual({ ok: false, reason: "malformed" });
  });
});
