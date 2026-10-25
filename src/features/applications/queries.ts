import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  applicationFiles,
  applications,
  campaigns,
  claims,
  users,
} from "@/db/schema";

import { tabStatuses, type ApplicationTab } from "./applicationTabs";

// Data access for the parent application flow. Deliberately thin: every
// authorization decision is made by the pure predicates in ./authz and passed in
// already-decided. These functions execute, they don't adjudicate.
//
// Every parent-facing read is scoped to ONE campaign (invariant: the archive is
// derived — prior-year applications are hidden because their campaign isn't
// active, not because we keep a separate store).

type Application = typeof applications.$inferSelect;

// One row of «Мої заявки» (Figma 139:4543). Only what the list draws: the list
// is the parent's own data, but a row type that carries the whole application
// invites the next screen to print all of it.
export type MyApplicationRow = {
  id: string;
  childName: string | null;
  childAge: number | null;
  status: Application["status"];
  submittedAt: Date | null;
  campaignTitle: string;
};

function myApplicationConditions(
  parentId: string,
  campaignId: string,
  tab: ApplicationTab,
) {
  return and(
    eq(applications.parentId, parentId),
    eq(applications.campaignId, campaignId),
    inArray(applications.status, [...tabStatuses(tab)]),
  );
}

export async function countMyApplications(
  parentId: string,
  campaignId: string,
  tab: ApplicationTab,
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(applications)
    .where(myApplicationConditions(parentId, campaignId, tab));
  return row?.total ?? 0;
}

// Newest activity first, with the id as a tiebreaker so a page boundary never
// shows one row twice or skips one.
export async function listMyApplications(
  parentId: string,
  campaignId: string,
  page: { tab: ApplicationTab; limit: number; offset: number },
): Promise<MyApplicationRow[]> {
  return getDb()
    .select({
      id: applications.id,
      childName: applications.childName,
      childAge: applications.childAge,
      status: applications.status,
      submittedAt: applications.submittedAt,
      campaignTitle: campaigns.title,
    })
    .from(applications)
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(myApplicationConditions(parentId, campaignId, page.tab))
    .orderBy(desc(applications.updatedAt), desc(applications.id))
    .limit(page.limit)
    .offset(page.offset);
}

// Deletes one of this parent's DRAFTS, and returns the storage keys of the
// files it held so the caller can remove the objects too.
//
// Hard, not soft: a draft was never submitted, so nobody has reviewed,
// claimed or relied on it, and what it may hold — a child's photos, a ВПО
// certificate — is exactly the data we should not keep once the family has
// said they do not want it. The file ROWS go by the FK's cascade; the objects
// they point at are the caller's job, because storage is not in this
// transaction.
//
// Every condition is in the SQL, not only in the caller: the row is locked
// first, so an upload racing the delete waits for it (its insert needs the
// row) and then fails on the FK instead of leaving an object nothing points
// at; and the delete itself repeats owner + draft, so a draft submitted in
// another tab a moment ago is not deleted from under its review.
export async function deleteMyDraft(
  id: string,
  parentId: string,
): Promise<{ deleted: boolean; storageKeys: string[] }> {
  return getDb().transaction(async (tx) => {
    const draft = and(
      eq(applications.id, id),
      eq(applications.parentId, parentId),
      eq(applications.status, "draft"),
    );
    const [locked] = await tx
      .select({ id: applications.id })
      .from(applications)
      .where(draft)
      .for("update");
    if (!locked) {
      return { deleted: false, storageKeys: [] };
    }

    const files = await tx
      .select({ storageKey: applicationFiles.storageKey })
      .from(applicationFiles)
      .where(eq(applicationFiles.applicationId, id));
    const removed = await tx
      .delete(applications)
      .where(draft)
      .returning({ id: applications.id });

    return {
      deleted: removed.length > 0,
      storageKeys: removed.length > 0 ? files.map((f) => f.storageKey) : [],
    };
  });
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
// Submit, or RE-submit after an edit.
//
// `submitted` is accepted as well as `draft` because a parent may still change
// an application until an admin reviews it (the edit lock lands on approval,
// not on submit) — and pressing the button again after an edit is the obvious
// way to save it. Guarding on `draft` alone made that fail, and the failure was
// reported as "locked", which told the parent their application had already
// been reviewed when it had not.
//
// submitted_at is set only ONCE. It is the timestamp the two-day review promise
// is measured from and the moderation queue is ordered by, so refreshing it on
// every edit would silently push a family to the back of the queue for fixing
// a typo.
export async function submitApplication(
  id: string,
  parentId: string,
  values: Partial<typeof applications.$inferInsert>,
): Promise<boolean> {
  const rows = await getDb()
    .update(applications)
    .set({
      ...values,
      status: "submitted",
      submittedAt: sql`coalesce(${applications.submittedAt}, now())`,
    })
    .where(
      and(
        eq(applications.id, id),
        eq(applications.parentId, parentId),
        inArray(applications.status, ["draft", "submitted"]),
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

// The parent's own name, from the verified provider profile, to PREFILL «Ваше
// прізвище та ім'я» on a new application.
//
// A prefill, not a copy: the field stays editable and the application keeps its
// own parent_name. The Telegram profile name is whatever the person put on
// their account — a nickname, one word, an emoji — and the gift is handed over
// against this name, so the parent has to be able to correct it.
//
// Read here rather than from the actor: the actor deliberately carries only
// firstName (it travels widely), and a name without the surname is not what
// this field is asking for.
export async function getUserFullName(userId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ firstName: users.firstName, lastName: users.lastName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) {
    return null;
  }
  const name = [row.firstName, row.lastName]
    .map((part) => part?.trim())
    .filter((part) => part)
    .join(" ");
  return name === "" ? null : name;
}

// Everything the file routes need to authorize a read: the application (for
// ownership), its ACTIVE claim (for the claiming-volunteer rule), and whether
// it is BROWSABLE (for the letter photo, which any volunteer may see while the
// child is on a card — see canViewApplicationFile). Not scoped to a parent — an
// admin or a claiming volunteer must be able to reach it, and the authorization
// decision is made by the predicates, not by this query.
export async function getApplicationForFileAccess(
  applicationId: string,
): Promise<{
  application: Application;
  claim: { volunteerId: string; releasedAt: Date | null } | null;
  browsable: boolean;
} | null> {
  const db = getDb();
  // The campaign comes along because "browsable" is not a property of the
  // application alone: a child from last year is approved and claimed and still
  // must not be reachable, because their campaign is no longer active.
  const [row] = await db
    .select({ application: applications, campaignStatus: campaigns.status })
    .from(applications)
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) {
    return null;
  }
  const application = row.application;
  // `approved` only, exactly like the browse list: once a child is claimed they
  // are on nobody's card, so no volunteer has a reason to read their letter
  // through this route. The one who HOLDS them still can — that comes from the
  // active claim, not from this flag.
  const browsable =
    row.campaignStatus === "active" && application.status === "approved";
  const [claim] = await db
    .select({ volunteerId: claims.volunteerId, releasedAt: claims.releasedAt })
    .from(claims)
    .where(eq(claims.applicationId, applicationId))
    .limit(1);
  return { application, claim: claim ?? null, browsable };
}

// Mark a wish fulfilled. Guarded on `claimed` in SQL, not only in the UI: a
// double submit, or a release that landed in between, must not be able to move
// an application into `fulfilled` from anywhere else.
export async function markFulfilled(
  applicationId: string,
  parentId: string,
): Promise<boolean> {
  const rows = await getDb()
    .update(applications)
    .set({ status: "fulfilled" })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.parentId, parentId),
        eq(applications.status, "claimed"),
      ),
    )
    .returning({ id: applications.id });
  return rows.length > 0;
}

// The volunteer holding this parent's child, for "look up my volunteer".
//
// This is the ONLY place the disclosure runs the other way: everywhere else a
// volunteer is shown the family's contact. A family that has handed over a
// child's address deserves to know who has it and how to reach them.
export async function getMyVolunteers(parentId: string, campaignId: string) {
  return getDb()
    .select({
      applicationId: applications.id,
      childName: applications.childName,
      status: applications.status,
      claimedAt: claims.claimedAt,
      volunteerUsername: users.username,
      volunteerFirstName: users.firstName,
      volunteerPhone: users.phone,
    })
    .from(applications)
    .innerJoin(
      claims,
      and(eq(claims.applicationId, applications.id), isNull(claims.releasedAt)),
    )
    .innerJoin(users, eq(users.id, claims.volunteerId))
    .where(
      and(
        eq(applications.parentId, parentId),
        eq(applications.campaignId, campaignId),
      ),
    )
    .orderBy(asc(claims.claimedAt));
}
