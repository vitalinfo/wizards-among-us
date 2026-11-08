import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";

import type { ContactMethod } from "@/db/enums";

// Contactability (Phase 4 decision): a Telegram @username is OPTIONAL, so some
// people have no handle a volunteer can click — the numeric Telegram id we store
// is usable by our bot, not by a human. We therefore never block sign-in, and
// instead require a usable contact at SUBMIT / CLAIM.
//
// The contact lives on the USER, not on each application: a parent filing three
// applications has one contact, and a copy taken at submit would go stale
// exactly when a volunteer needs to reach them.

// Telegram usernames: 5–32 chars, letters/digits/underscore. We accept a leading
// @ and strip it, so stored values match users.username and can become a t.me link.
const TELEGRAM_HANDLE = /^[A-Za-z0-9_]{5,32}$/;

// The fallback a user supplies when they have no Telegram handle. Any country —
// a displaced family may only have a Polish or German SIM by now — but always in
// international format: with no default country the parser rejects anything
// that doesn't start with «+» and a country code, so nothing is guessed.
// Stored as E.164 (+380671234567) so numbers stay comparable and tel:-linkable.
// `/max` metadata validates against each country's real number ranges, not just
// length; this schema runs only on the server, so its size costs no bundle.
export const userPhoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = parsePhoneNumberFromString(value);
    if (!phone?.isValid()) {
      ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return z.NEVER;
    }
    return phone.number;
  });

export const telegramHandleSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/^@/, ""))
  .refine((value) => TELEGRAM_HANDLE.test(value), {
    message: "invalid_telegram_handle",
  });

export type ResolvedContact = { method: ContactMethod; value: string };

// The single place that answers "how does a volunteer reach this family?".
// Prefers the Telegram handle (kept in sync on every login) and falls back to
// the stored phone. Returns null when neither exists — which is exactly what
// blocks submit/claim.
export function resolveUserContact(
  user: { username: string | null; phone: string | null } | null | undefined,
): ResolvedContact | null {
  if (!user) {
    return null;
  }
  if (user.username) {
    return { method: "telegram", value: user.username };
  }
  if (user.phone) {
    return { method: "phone", value: user.phone };
  }
  return null;
}

export function isContactable(
  user: { username: string | null; phone: string | null } | null | undefined,
): boolean {
  return resolveUserContact(user) !== null;
}
