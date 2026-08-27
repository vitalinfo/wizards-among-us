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

export type MaybeActor = Actor | null | undefined;

export function isAdmin(actor: MaybeActor): actor is AdminActor {
  return actor?.kind === "admin";
}
export function isUser(actor: MaybeActor): actor is UserActor {
  return actor?.kind === "user";
}
export function hasRole(actor: MaybeActor, role: UserRole): boolean {
  return isUser(actor) && actor.roles.includes(role);
}
