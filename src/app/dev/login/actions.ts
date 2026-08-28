"use server";

import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { getDb } from "@/db";
import type { UserRole } from "@/db/enums";
import { users } from "@/db/schema";
import {
  assertDevLoginEnabled,
  DEV_LOGIN_ROLES,
  type DevLoginRoleKey,
} from "@/lib/auth/devLogin";
import { safeReturnPath } from "@/lib/auth/returnPath";
import { createSession } from "@/lib/auth/session";

// Dev-only: find-or-create a deterministic test user for the chosen role preset
// and open a session as them. Idempotent per role (keyed by a `dev_<role>`
// username), so repeat logins reuse the same user + its data. Guarded — see
// devLogin.ts. Never provisions an admin.
export async function devLogin(
  roleKey: DevLoginRoleKey,
  returnTo?: string,
): Promise<void> {
  assertDevLoginEnabled();

  // roleKey is typed, but this action can also be POSTed directly — reject any
  // key that isn't a known preset before it reaches the DB.
  if (!Object.hasOwn(DEV_LOGIN_ROLES, roleKey)) {
    notFound();
  }
  const roles = DEV_LOGIN_ROLES[roleKey];

  const db = getDb();
  const username = `dev_${roleKey}`;
  const role: UserRole[] = [...roles];

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  let userId: string;
  if (existing) {
    await db.update(users).set({ role }).where(eq(users.id, existing.id));
    userId = existing.id;
  } else {
    const [created] = await db
      .insert(users)
      .values({ username, role, note: "dev login user" })
      .returning({ id: users.id });
    userId = created.id;
  }

  await createSession({ actorType: "user", actorId: userId });
  redirect(safeReturnPath(returnTo));
}
