import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import type { ActorType } from "@/db/enums";
import { admins, sessions, users } from "@/db/schema";
import { type Actor, type AdminActor, isAdmin } from "@/lib/authz";

import { randomToken, sha256Base64Url } from "./encoding";

const COOKIE_NAME = "wau_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Create a session for an authenticated actor and set the cookie. Call from a
// Server Action / Route Handler (where cookies are writable). The opaque token
// lives only in the cookie; the DB stores just its hash.
export async function createSession(target: {
  actorType: ActorType;
  actorId: string;
}): Promise<void> {
  const token = randomToken();
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + TTL_MS);

  await getDb()
    .insert(sessions)
    .values({ ...target, tokenHash, expiresAt });

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// Resolve the current request's actor, or null. Looks up a non-expired session
// by token hash, then maps it to the Phase-1 Actor from our domain tables.
// A client-side check is never a substitute for calling this on the server.
export async function getSessionActor(): Promise<Actor | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const db = getDb();
  const tokenHash = await sha256Base64Url(token);
  const [session] = await db
    .select({ actorType: sessions.actorType, actorId: sessions.actorId })
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!session) {
    return null;
  }

  if (session.actorType === "admin") {
    const [admin] = await db
      .select({ id: admins.id, email: admins.email })
      .from(admins)
      .where(eq(admins.id, session.actorId))
      .limit(1);
    return admin ? { kind: "admin", id: admin.id, email: admin.email } : null;
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, session.actorId))
    .limit(1);
  return user ? { kind: "user", id: user.id, roles: user.role } : null;
}

// Log out: delete the session row (instant revocation) and clear the cookie.
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = await sha256Base64Url(token);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  store.delete(COOKIE_NAME);
}

// Guard for admin-only server actions / route handlers. Throws when the caller
// isn't an admin; callers decide how to surface it (redirect / 403).
export async function requireAdmin(): Promise<AdminActor> {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    throw new Error("Unauthorized: admin session required");
  }
  return actor;
}
