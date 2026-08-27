import { and, desc, eq, ilike } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, users } from "@/db/schema";

// Data access for the parent application flow. Deliberately thin: every
// authorization decision is made by the pure predicates in ./authz and passed in
// already-decided. These functions execute, they don't adjudicate.
//
// Every parent-facing read is scoped to ONE campaign (invariant: the archive is
// derived — prior-year applications are hidden because their campaign isn't
// active, not because we keep a separate store).

type Application = typeof applications.$inferSelect;

export type MyApplicationSummary = {
  id: string;
  childName: string | null;
  childAge: number | null;
  giftDescription: string | null;
  status: Application["status"];
  submittedAt: Date | null;
  updatedAt: Date;
};

export async function listMyApplications(
  parentId: string,
  campaignId: string,
): Promise<MyApplicationSummary[]> {
  return getDb()
    .select({
      id: applications.id,
      childName: applications.childName,
      childAge: applications.childAge,
      giftDescription: applications.giftDescription,
      status: applications.status,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(
      and(
        eq(applications.parentId, parentId),
        eq(applications.campaignId, campaignId),
      ),
    )
    .orderBy(desc(applications.updatedAt));
}

// Full row for the edit form / detail view. Returns null when it doesn't exist
// OR isn't this parent's — the caller can't distinguish, which is intentional:
// a wrong id must not confirm that someone else's application exists.
export async function getMyApplication(
  id: string,
  parentId: string,
): Promise<Application | null> {
  const [row] = await getDb()
    .select()
    .from(applications)
    .where(and(eq(applications.id, id), eq(applications.parentId, parentId)))
    .limit(1);
  return row ?? null;
}

export async function createDraft(
  parentId: string,
  campaignId: string,
): Promise<string> {
  const [row] = await getDb()
    .insert(applications)
    .values({ parentId, campaignId, status: "draft" })
    .returning({ id: applications.id });
  return row.id;
}

// Partial save. Scoped by parentId so a crafted id can't write to someone
// else's row even if the caller forgot to check.
export async function saveDraft(
  id: string,
  parentId: string,
  values: Partial<typeof applications.$inferInsert>,
): Promise<void> {
  await getDb()
    .update(applications)
    .set(values)
    .where(and(eq(applications.id, id), eq(applications.parentId, parentId)));
}

// Marks the application submitted. Sets submitted_at — the timestamp that makes
// the "reviewed within two days" promise measurable, and which stands in for the
// consent record (consent is a hard gate, so submission implies it).
//
// The status guard in the WHERE clause is the last line of defence on the edit
// lock: even if two tabs race, an already-approved application can't be
// re-submitted. Returns false when nothing was updated.
export async function submitApplication(
  id: string,
  parentId: string,
  values: Partial<typeof applications.$inferInsert>,
): Promise<boolean> {
  const rows = await getDb()
    .update(applications)
    .set({ ...values, status: "submitted", submittedAt: new Date() })
    .where(
      and(
        eq(applications.id, id),
        eq(applications.parentId, parentId),
        eq(applications.status, "draft"),
      ),
    )
    .returning({ id: applications.id });
  return rows.length > 0;
}

// Soft duplicate check (Phase 4 decision): warn, don't block. Child names are
// free text, so a unique constraint would reject "Оля" vs "Ольга" as different
// and accept a genuine duplicate typed slightly differently. Admin review is
// the real safeguard.
export async function findSameChildNameInCampaign(
  parentId: string,
  campaignId: string,
  childName: string,
  excludeApplicationId?: string,
): Promise<{ id: string; childName: string | null }[]> {
  const rows = await getDb()
    .select({ id: applications.id, childName: applications.childName })
    .from(applications)
    .where(
      and(
        eq(applications.parentId, parentId),
        eq(applications.campaignId, campaignId),
        ilike(applications.childName, childName.trim()),
      ),
    );
  return excludeApplicationId
    ? rows.filter((row) => row.id !== excludeApplicationId)
    : rows;
}

// Grants the `parent` capability on first submit. Roles are earned by what
// someone does, not assigned at login (identity model), so this is where a
// signed-in person becomes a parent. Idempotent: re-submitting doesn't
// duplicate the role, and it never removes an existing `volunteer` role.
export async function grantParentRole(userId: string): Promise<void> {
  const db = getDb();
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.role.includes("parent")) {
    return;
  }
  await db
    .update(users)
    .set({ role: [...user.role, "parent"] })
    .where(eq(users.id, userId));
}

// The parent's contact, read live rather than copied onto the application (see
// features/users/contact.ts for why).
export async function getUserContactFields(
  userId: string,
): Promise<{ username: string | null; phone: string | null } | null> {
  const [row] = await getDb()
    .select({ username: users.username, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}
