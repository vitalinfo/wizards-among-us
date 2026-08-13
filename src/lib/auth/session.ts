import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import type { ActorType } from "@/db/enums";
import { admins, sessions, users } from "@/db/schema";
import { type Actor, type AdminActor, isAdmin } from "@/lib/authz";

import { randomToken, sha256Base64Url } from "./encoding";

export const SESSION_COOKIE_NAME = "wau_session";
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type SessionTarget = { actorType: ActorType; actorId: string };

// Shared cookie attributes so server actions and route handlers set the session
// cookie identically.
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

// Creates the session row and returns the raw token + expiry. The caller sets
// the cookie — a server action via cookies(), a route handler on its response
// (cookies() mutations don't attach to a custom NextResponse).
export async function createSessionRecord(
  target: SessionTarget,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const tokenHash = await sha256Base64Url(token);
  const expiresAt = new Date(Date.now() + TTL_MS);
  await getDb()
    .insert(sessions)
    .values({ ...target, tokenHash, expiresAt });
  return { token, expiresAt };
}

// For server actions / server components with writable cookies.
export async function createSession(target: SessionTarget): Promise<void> {
  const { token, expiresAt } = await createSessionRecord(target);
  (await cookies()).set(
    SESSION_COOKIE_NAME,
    token,
    sessionCookieOptions(expiresAt),
  );
}

// Resolve the current request's actor, or null. Looks up a non-expired session
// by token hash, then maps it to the Phase-1 Actor from our domain tables.
// A client-side check is never a substitute for calling this on the server.
export async function getSessionActor(): Promise<Actor | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
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

  // lastName is deliberately NOT selected — the actor travels widely, so it
  // carries only what's needed to identify the person in the UI.
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.actorId))
    .limit(1);
  return user
    ? {
        kind: "user",
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        roles: user.role,
      }
    : null;
}

// Log out: delete the session row (instant revocation) and clear the cookie.
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = await sha256Base64Url(token);
    await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash));
  }
  store.delete(SESSION_COOKIE_NAME);
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
