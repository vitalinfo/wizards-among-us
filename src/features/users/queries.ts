import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";

// The parent's fallback contact, stored once on the user rather than copied
// onto every application — a snapshot would go stale exactly when a volunteer
// needs to reach the family (see ./contact.ts).
export async function setUserPhone(
  userId: string,
  phone: string,
): Promise<void> {
  await getDb().update(users).set({ phone }).where(eq(users.id, userId));
}

// Opt in as a volunteer (Phase 6 decision: self-serve, no approval gate — §11's
// compensating controls are the redacted browse card and the audit log).
//
// Roles are a SET, so this adds rather than replaces: a parent who also wants to
// be a wizard keeps both. array_append is guarded so pressing the button twice
// doesn't produce {'volunteer','volunteer'}.
export async function addVolunteerRole(userId: string): Promise<void> {
  await getDb()
    .update(users)
    .set({ role: sql`array_append(${users.role}, 'volunteer')` })
    .where(
      and(
        eq(users.id, userId),
        sql`not (${users.role} @> ARRAY['volunteer']::text[])`,
      ),
    );
}

// Just the fields resolveUserContact needs, for the claim gate.
export async function getUserContact(
  userId: string,
): Promise<{ username: string | null; phone: string | null } | null> {
  const [row] = await getDb()
    .select({ username: users.username, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}
