import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { identities, users } from "@/db/schema";

import type { TelegramProfile } from "./telegram";

// Resolve a verified Telegram profile to our domain user id, creating the
// `users` + `identities` rows on first login (plan §4). No role is assigned here
// — role is a capability granted by what the person does (submit → parent,
// claim → volunteer), not at sign-in. The username is kept in sync for display
// + the volunteer filter.
export async function findOrCreateTelegramUser(
  profile: TelegramProfile,
): Promise<string> {
  const db = getDb();
  const username = profile.username ?? null;
  const data = {
    username,
    firstName: profile.firstName,
    lastName: profile.lastName ?? null,
    photoUrl: profile.photoUrl ?? null,
    authDate: profile.authDate,
  };

  const findIdentity = async () => {
    const [row] = await db
      .select({ id: identities.id, userId: identities.userId })
      .from(identities)
      .where(
        and(
          eq(identities.provider, "telegram"),
          eq(identities.providerUserId, profile.id),
        ),
      )
      .limit(1);
    return row;
  };

  const existing = await findIdentity();
  if (existing) {
    await db
      .update(users)
      .set({ username })
      .where(eq(users.id, existing.userId));
    await db
      .update(identities)
      .set({ data })
      .where(eq(identities.id, existing.id));
    return existing.userId;
  }

  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ username })
        .returning({ id: users.id });
      await tx.insert(identities).values({
        userId: user.id,
        provider: "telegram",
        providerUserId: profile.id,
        data,
      });
      return user.id;
    });
  } catch {
    // Race: a concurrent first-login won; the identity unique index rolled our
    // transaction back (so no orphan user). Re-read the winner.
    const winner = await findIdentity();
    if (winner) {
      return winner.userId;
    }
    throw new Error("findOrCreateTelegramUser: could not create or find user");
  }
}
