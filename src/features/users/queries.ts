import { eq } from "drizzle-orm";

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
