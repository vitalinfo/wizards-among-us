import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Verifies a Telegram Login Widget payload (plan §4). Telegram signs the login
// data with the bot token; we recompute the signature and compare in constant
// time, then reject stale payloads (replay protection). Pure and offline —
// no network, no DB — so it's fully unit-testable.
//
// Algorithm (Login Widget):
//   secret       = SHA256(bot_token)                       // raw bytes
//   check_string = "key=value" for every field except hash, sorted by key,
//                  joined with "\n", using the RAW string values Telegram sent
//   expected     = HMAC_SHA256(check_string, secret)       // hex
//   valid        = expected == hash  (constant time)  AND  auth_date is fresh

export type TelegramProfile = {
  id: string; // numeric Telegram id, kept as string (→ identities.provider_user_id)
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  authDate: number; // unix seconds
};

export type TelegramVerifyResult =
  | { ok: true; profile: TelegramProfile }
  | {
      ok: false;
      reason: "missing_hash" | "bad_hash" | "expired" | "malformed";
    };

type VerifyOptions = {
  maxAgeSeconds?: number; // reject payloads older than this (default 1 day)
  nowSeconds?: () => number; // injectable clock for tests
};

// Recompute the signature Telegram would have produced for these fields.
function sign(fields: Record<string, string>, botToken: string): string {
  const checkString = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${fields[key]}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
}

export function verifyTelegramLogin(
  raw: Record<string, string>,
  botToken: string,
  {
    maxAgeSeconds = 86_400,
    nowSeconds = () => Math.floor(Date.now() / 1000),
  }: VerifyOptions = {},
): TelegramVerifyResult {
  const { hash, ...fields } = raw;
  if (!hash) {
    return { ok: false, reason: "missing_hash" };
  }

  const expected = sign(fields, botToken);

  // Reject anything that isn't valid hex of the exact expected length before the
  // constant-time compare — Buffer.from(hex) silently truncates on invalid
  // input, which would otherwise let trailing garbage on a valid hash pass.
  if (!/^[0-9a-f]+$/i.test(hash) || hash.length !== expected.length) {
    return { ok: false, reason: "bad_hash" };
  }
  if (
    !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"))
  ) {
    return { ok: false, reason: "bad_hash" };
  }

  if (!fields.id || !fields.first_name || !fields.auth_date) {
    return { ok: false, reason: "malformed" };
  }
  const authDate = Number(fields.auth_date);
  if (!Number.isFinite(authDate)) {
    return { ok: false, reason: "malformed" };
  }
  if (nowSeconds() - authDate > maxAgeSeconds) {
    return { ok: false, reason: "expired" };
  }

  return {
    ok: true,
    profile: {
      id: fields.id,
      firstName: fields.first_name,
      lastName: fields.last_name || undefined,
      username: fields.username || undefined,
      photoUrl: fields.photo_url || undefined,
      authDate,
    },
  };
}
