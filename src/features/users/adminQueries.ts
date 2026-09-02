import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import type { UserRole } from "@/db/enums";
import { applications, claims, users } from "@/db/schema";

// Admin-side people data access. Authorization lives in the server actions
// (requireAdmin); these execute, they don't adjudicate.

export type AdminUserRow = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: readonly UserRole[];
  note: string | null;
  applicationCount: number;
  claimCount: number;
  createdAt: Date;
};

// Free-text search over the four things an admin actually knows when they go
// looking for someone: a first name, a last name, a Telegram handle, or a
// phone number. Substring, not prefix — an admin is as likely to remember
// «...Коваль» or the last four digits as the start of either.
//
// The phone is matched on DIGITS ONLY, on both sides. A stored number is
// normalised (userPhoneSchema strips spaces, brackets and dashes) but the
// person typing rarely is: "067 123" has to find "+380671234567", and a plain
// LIKE never would.
//
// A term with no digits skips the phone branch entirely rather than matching
// against an empty needle, which every phone would satisfy.
function searchCondition(term: string) {
  const trimmed = term.trim();
  if (trimmed === "") {
    return undefined;
  }

  const text = `%${trimmed.replace(/^@/, "").toLowerCase()}%`;
  const digits = trimmed.replace(/\D/g, "");

  return or(
    sql`lower(coalesce(${users.firstName}, '')) like ${text}`,
    sql`lower(coalesce(${users.lastName}, '')) like ${text}`,
    sql`lower(coalesce(${users.username}, '')) like ${text}`,
    // Also match a full name typed as one string — "Олена Коваль" is neither
    // column on its own.
    sql`lower(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')) like ${text}`,
    digits === ""
      ? undefined
      : sql`regexp_replace(coalesce(${users.phone}, ''), '\D', '', 'g') like ${`%${digits}%`}`,
  );
}

export async function countUsers(search = ""): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(users)
    .where(searchCondition(search));
  return row?.total ?? 0;
}

// The two counts as CORRELATED SUBQUERIES, built with the query builder rather
// than written into a raw sql`` fragment.
//
// Two traps, both silent:
//   - A join to two one-to-many tables multiplies the rows against each other,
//     so the "count" comes back as a product. Invisible until someone has both
//     an application and a claim.
//   - A raw sql`` fragment renders `${users.id}` UNQUALIFIED — the generated
//     SQL was `where "parent_id" = "id"`, comparing applications.parent_id to
//     applications.id. Every count came back 0, for everyone, with no error.
//     The builder qualifies them: `"applications"."parent_id" = "users"."id"`.
function userCounts() {
  const db = getDb();
  return {
    applicationCount: sql<number>`(${db
      .select({ v: count() })
      .from(applications)
      .where(eq(applications.parentId, users.id))})::int`,
    claimCount: sql<number>`(${db
      .select({ v: count() })
      .from(claims)
      .where(
        and(eq(claims.volunteerId, users.id), isNull(claims.releasedAt)),
      )})::int`,
  };
}

// Newest first: the reason to open this list is almost always someone who just
// appeared — a family that has written in, or a volunteer asking about a claim.
export async function listUsers(params: {
  limit: number;
  offset: number;
  search?: string;
}): Promise<AdminUserRow[]> {
  const rows = await getDb()
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      note: users.note,
      createdAt: users.createdAt,
      ...userCounts(),
    })
    .from(users)
    .where(searchCondition(params.search ?? ""))
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(params.limit)
    .offset(params.offset);

  return rows;
}

export async function getUserForAdmin(
  userId: string,
): Promise<AdminUserRow | null> {
  const [row] = await listUsersById(userId);
  return row ?? null;
}

async function listUsersById(userId: string): Promise<AdminUserRow[]> {
  return getDb()
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      role: users.role,
      note: users.note,
      createdAt: users.createdAt,
      ...userCounts(),
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
}

// Returns false when no such user exists, so the action can say so instead of
// silently reporting success for a note that went nowhere.
export async function setUserNote(
  userId: string,
  note: string | null,
): Promise<boolean> {
  const updated = await getDb()
    .update(users)
    .set({ note })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return updated.length > 0;
}

// The note shown at the top of an application, resolved through the owning
// parent. Null when there is no note — the banner is not rendered at all then.
export async function getParentNote(
  parentId: string,
): Promise<{ note: string; parentId: string } | null> {
  const [row] = await getDb()
    .select({ note: users.note })
    .from(users)
    .where(eq(users.id, parentId))
    .limit(1);
  const note = row?.note?.trim();
  return note ? { note, parentId } : null;
}
