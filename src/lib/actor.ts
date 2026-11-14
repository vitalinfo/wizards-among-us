import type { UserRole } from "@/db/enums";

// The authenticated actor and the primitives every feature's authorization
// predicates build on. Deliberately its own module (not lib/authz.ts): the
// features import these, and lib/authz.ts re-exports the features — putting
// both in one file would make that a circular import.
//
// A client-side check is UX only — never a security boundary (CLAUDE.md).
export type UserActor = {
  kind: "user";
  id: string;
  username: string | null; // Telegram @handle, for display — OPTIONAL on Telegram
  firstName: string | null; // display fallback when there's no @handle
  roles: readonly UserRole[];
};
export type AdminActor = { kind: "admin"; id: string; email: string };
export type Actor = UserActor | AdminActor;

// A signed-in user an admin has banned. Deliberately NOT a UserActor: every
// predicate in the app is built on `isUser`, so a separate kind is refused by
// all of them — pages, server actions, the file routes — without any of them
// having to remember a ban exists. Not part of `Actor` either, so it can never
// be passed to recordAuditLog as someone who did something.
export type BannedActor = { kind: "banned"; id: string };
export type SessionActor = Actor | BannedActor;

export type MaybeActor = SessionActor | null | undefined;

export function isAdmin(actor: MaybeActor): actor is AdminActor {
  return actor?.kind === "admin";
}
export function isUser(actor: MaybeActor): actor is UserActor {
  return actor?.kind === "user";
}
export function isBanned(actor: MaybeActor): actor is BannedActor {
  return actor?.kind === "banned";
}
export function hasRole(actor: MaybeActor, role: UserRole): boolean {
  return isUser(actor) && actor.roles.includes(role);
}
