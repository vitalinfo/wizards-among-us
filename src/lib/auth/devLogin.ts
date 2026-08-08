import { notFound } from "next/navigation";

import type { UserRole } from "@/db/enums";

// Dev-only local sign-in that bypasses the Telegram widget (which can't render
// on localhost — it needs a BotFather-authorized domain). Lets you exercise the
// gated parent/volunteer flows locally without a tunnel.
//
// SECURITY — this is a login backdoor, and this app stores children's data, so
// it must never be reachable in a real deploy. Two INDEPENDENT gates, either of
// which disables it:
//   1. NODE_ENV === "production"  → hard off in any production build, always.
//   2. DEV_LOGIN !== "1"          → off unless explicitly opted in; the flag
//      lives ONLY in .env.local, never in staging/prod secrets.
// It also only ever mints a *user* session (parent/volunteer) — never an admin
// one — so the backdoor cannot escalate to admin. Admins use /admin/login.
export function isDevLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1";
}

// Guard for the dev-login page + action: renders/returns 404 when disabled, so
// the route is indistinguishable from "does not exist" when the gate is off.
export function assertDevLoginEnabled(): void {
  if (!isDevLoginEnabled()) {
    notFound();
  }
}

// The role presets the dev-login page offers. A user's role is a combinable set
// (see users.role: text[]), so "both" is a valid person too.
export const DEV_LOGIN_ROLES = {
  parent: ["parent"],
  volunteer: ["volunteer"],
  both: ["parent", "volunteer"],
} as const satisfies Record<string, readonly UserRole[]>;

export type DevLoginRoleKey = keyof typeof DEV_LOGIN_ROLES;
