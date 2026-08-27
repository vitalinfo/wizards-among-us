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
// Ukrainian mobile in the shape the 2025 form asked for: +38 0XX XXX XX XX.
const UA_PHONE = /^\+380\d{9}$/;

// The fallback a user supplies when they have no Telegram handle. Normalized so
// stored numbers are comparable (the form let people type spaces and dashes).
export const userPhoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .refine((value) => UA_PHONE.test(value), { message: "invalid_ua_phone" });

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
