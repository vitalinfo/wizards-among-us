import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import type { UkraineRegion } from "@/db/enums";
import {
  applicationFiles,
  applications,
  campaigns,
  claims,
  users,
} from "@/db/schema";
import { toBrowseCard, type BrowseCard } from "@/features/applications/mappers";

// Volunteer-facing data access. Authorization lives in the actions/pages
// (canBrowseChildren / canClaim); these execute, they don't adjudicate.

export type BrowseFilters = {
  campaignId: string;
  // Matches home_region: the region the family left.
  region?: UkraineRegion;
  minAge?: number;
  maxAge?: number;
};

// A browse row is the redacted card plus whether it is taken. It deliberately
// carries NOTHING beyond toBrowseCard's projection — the sensitive fields are
// dropped at the data layer, so a card physically cannot leak an address to the
// client (child-data invariant, tier 1).
export type BrowseRow = BrowseCard;

type Application = typeof applications.$inferSelect;

// `approved` and nothing else: a child who already has a charivnyk is not in
// this list (Vital, 2026-10-23).
//
// Phase 6 kept `claimed` here, visible but marked, so a volunteer could see how
// the campaign was going, and paired it with an availability filter for hiding
// them. The 118:420 design has neither — no claimed state on the card and no
// third picker — which is the design saying this list is what you can still
// take. Taken children live in «Мої підопічні», where the volunteer holding
// them looks. The «Уже взяли» label I had put on the card was me papering over
// that mismatch rather than asking about it.
const BROWSABLE = sql`${applications.status} = 'approved'`;

function browseConditions(filters: BrowseFilters) {
  return [
    // Scoped to ONE campaign (invariant): prior-year families must never
    // surface to volunteers.
    eq(applications.campaignId, filters.campaignId),
    BROWSABLE,
    filters.region ? eq(applications.homeRegion, filters.region) : undefined,
    filters.minAge !== undefined
      ? gte(applications.childAge, filters.minAge)
      : undefined,
    filters.maxAge !== undefined
      ? lte(applications.childAge, filters.maxAge)
      : undefined,
  ].filter(Boolean);
}

export async function countBrowsable(filters: BrowseFilters): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(applications)
    .where(and(...browseConditions(filters)));
  return row?.total ?? 0;
}

export async function listBrowsable(
  filters: BrowseFilters & { limit: number; offset: number },
): Promise<BrowseRow[]> {
  // No join on claims: `approved` already means nobody holds it, because
  // claiming moves the status. There is nothing left to ask.
  const rows = await getDb()
    .select({ application: applications })
    .from(applications)
    .where(and(...browseConditions(filters)))
    // Oldest approval first so the longest-waiting child is seen first, with id
    // as the tiebreaker — without a total order, rows can swap between pages
    // and one would never be shown.
    .orderBy(asc(applications.updatedAt), asc(applications.id))
    .limit(filters.limit)
    .offset(filters.offset);

  // One extra query for the whole page rather than a join: a letter photo is
  // one row per application in the general case but nothing in the schema
  // guarantees it (a parent can upload twice without removing the first), so a
  // join would multiply the page. Ordered oldest-first and written into a map,
  // so the LAST match wins — "the newest of this kind is the last match" is the
  // rule listApplicationFiles documents, and the one every caller wants.
  const letterPhotos = await latestLetterPhotos(
    rows.map((r) => r.application.id),
  );

  return rows.map((row) =>
    toBrowseCard(row.application, letterPhotos.get(row.application.id) ?? null),
  );
}

async function latestLetterPhotos(
  applicationIds: readonly string[],
): Promise<Map<string, string>> {
  if (applicationIds.length === 0) {
    return new Map();
  }
  const rows = await getDb()
    .select({
      applicationId: applicationFiles.applicationId,
      id: applicationFiles.id,
    })
    .from(applicationFiles)
    .where(
      and(
        inArray(applicationFiles.applicationId, [...applicationIds]),
        eq(applicationFiles.kind, "letter_photo"),
      ),
    )
    .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));

  const latest = new Map<string, string>();
  for (const row of rows) {
    latest.set(row.applicationId, row.id);
  }
  return latest;
}

// The active claim on an application, if any.
export async function getActiveClaim(applicationId: string) {
  const [row] = await getDb()
    .select()
    .from(claims)
    .where(
      and(eq(claims.applicationId, applicationId), isNull(claims.releasedAt)),
    )
    .limit(1);
  return row ?? null;
}

export type ClaimOutcome = "claimed" | "taken";

// THE single write path into `claims`. Both a volunteer claiming for themselves
// and an admin assigning by hand come through here, because the invariant that
// makes double-claiming impossible is one unique index plus one transaction —
// a second writer is exactly how that gets broken.
//
// The unique index on claims.application_id is the real guard: two volunteers
// pressing the button at the same instant both reach the INSERT and exactly one
// survives. The ON CONFLICT branch handles re-claiming an application whose
// previous claim was RELEASED — that row already exists, so it is an UPDATE
// (the Phase 1 decision: one claim row per application, reused).
//
// `takeover` is the ONLY difference between the two callers:
//   false (a volunteer) — setWhere refuses to touch an ACTIVE claim, so a
//                         conflict changes nothing and is reported as "taken"
//                         rather than silently stealing a child.
//   true  (an admin)    — reassignment is the point, so an active claim is
//                         overwritten. That IS the release of the incumbent:
//                         with one row per application there is nothing to
//                         release separately. Who held it before survives in
//                         audit_log (their claim.created), not in this row.
//
// The application's status moves in the SAME transaction: a claim that didn't
// flip the status would leave the child listed as available.
async function writeClaim(
  applicationId: string,
  volunteerId: string,
  takeover: boolean,
): Promise<ClaimOutcome> {
  return getDb().transaction(async (tx) => {
    const written = await tx
      .insert(claims)
      .values({ applicationId, volunteerId })
      .onConflictDoUpdate({
        target: claims.applicationId,
        set: { volunteerId, claimedAt: new Date(), releasedAt: null },
        ...(takeover
          ? {}
          : { setWhere: sql`${claims.releasedAt} is not null` }),
      })
      .returning({ id: claims.id });

    if (written.length === 0) {
      return "taken";
    }

    // An admin may assign a child whose application is already `claimed` (that
    // is a reassignment), so both states are acceptable targets. The guard
    // still excludes draft/submitted/rejected/fulfilled.
    const claimable = takeover
      ? inArray(applications.status, ["approved", "claimed"])
      : eq(applications.status, "approved");

    const updated = await tx
      .update(applications)
      .set({ status: "claimed" })
      .where(and(eq(applications.id, applicationId), claimable))
      .returning({ id: applications.id });

    if (updated.length === 0) {
      // Not claimable after all (moderated in between). Roll the claim back
      // rather than leaving one on a non-approved row.
      tx.rollback();
    }
    return "claimed";
  });
}

// A volunteer claiming for themselves: never takes over an active claim.
export async function claimApplication(
  applicationId: string,
  volunteerId: string,
): Promise<ClaimOutcome> {
  return writeClaim(applicationId, volunteerId, false);
}

// An admin assigning by hand (plan §9 Phase 6). Same transaction, same unique
// index — reassignment replaces the incumbent instead of inserting a second row.
export async function assignVolunteer(
  applicationId: string,
  volunteerId: string,
): Promise<ClaimOutcome> {
  return writeClaim(applicationId, volunteerId, true);
}

// Release a claim. ADMIN only (Phase 6 decision) — the predicate is enforced by
// the caller; this executes. The row is kept and marked released rather than
// deleted, so the audit trail of who held a child survives.
export async function releaseClaim(applicationId: string): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const released = await tx
      .update(claims)
      .set({ releasedAt: new Date() })
      .where(
        and(eq(claims.applicationId, applicationId), isNull(claims.releasedAt)),
      )
      .returning({ id: claims.id });
    if (released.length === 0) {
      return false;
    }
    // Back into the pool. Guarded on `claimed` so a fulfilled application is
    // never dragged backwards by a release.
    await tx
      .update(applications)
      .set({ status: "approved" })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.status, "claimed"),
        ),
      );
    return true;
  });
}

// «Мої підопічні» (Figma 130:2506). Which children this volunteer holds, as a
// LIST — the row carries the child's name, age, the campaign and the state, and
// nothing else.
//
// Deliberately NOT the sensitive set. The previous version of this query handed
// every row the whole application plus the family's contact, because the old
// page printed all of it on every card; the redesign puts that behind «Дії», so
// the list no longer needs it and no longer asks for it. The detail page is the
// one place tier-2 data is read, and it reads one child at a time.
export type ClaimTab = "all" | "active" | "completed";

export type MyClaimRow = {
  applicationId: string;
  childName: string | null;
  childAge: number | null;
  // Drives the avatar: the design tints the disc pink for a girl and blue for a
  // boy, which is the first thing on the row that is not text.
  childGender: Application["childGender"];
  campaignTitle: string;
  // `claimed` while the gift is on its way, `fulfilled` once the family has
  // confirmed it arrived. Nothing else can be here: a claim only exists on an
  // application that was approved, and releasing one puts it back to approved
  // while clearing the claim.
  status: Application["status"];
  claimedAt: Date;
};

// `claimed` is «Допомога триває», `fulfilled` is «Допомогу завершено» — the two
// tabs, and the two states the design draws.
const TAB_STATUSES: Record<ClaimTab, readonly Application["status"][]> = {
  all: ["claimed", "fulfilled"],
  active: ["claimed"],
  completed: ["fulfilled"],
};

function myClaimConditions(
  volunteerId: string,
  campaignId: string,
  tab: ClaimTab,
) {
  return and(
    eq(claims.volunteerId, volunteerId),
    isNull(claims.releasedAt),
    eq(applications.campaignId, campaignId),
    inArray(applications.status, [...TAB_STATUSES[tab]]),
  );
}

export async function countMyClaims(
  volunteerId: string,
  campaignId: string,
  tab: ClaimTab,
): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(claims)
    .innerJoin(applications, eq(applications.id, claims.applicationId))
    .where(myClaimConditions(volunteerId, campaignId, tab));
  return row?.total ?? 0;
}

export async function listMyClaims(
  volunteerId: string,
  campaignId: string,
  page: { tab: ClaimTab; limit: number; offset: number },
): Promise<MyClaimRow[]> {
  return (
    getDb()
      .select({
        applicationId: applications.id,
        childName: applications.childName,
        childAge: applications.childAge,
        childGender: applications.childGender,
        campaignTitle: campaigns.title,
        status: applications.status,
        claimedAt: claims.claimedAt,
      })
      .from(claims)
      .innerJoin(applications, eq(applications.id, claims.applicationId))
      .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
      .where(myClaimConditions(volunteerId, campaignId, page.tab))
      // Oldest claim first, with the application id as a tiebreaker: without a
      // total order a row can swap between pages and one would never be shown.
      .orderBy(asc(claims.claimedAt), asc(applications.id))
      .limit(page.limit)
      .offset(page.offset)
  );
}

// One child this volunteer holds, with the sensitive set — current town,
// delivery information, the parent's name and the family's contact (tier 2).
//
// Scoped to THEIR OWN ACTIVE CLAIM in the where clause, not checked afterwards:
// a volunteer asking for an application they do not hold gets nothing back, so
// there is no object for a later check to be forgotten about.
export async function getMyClaim(volunteerId: string, applicationId: string) {
  const [row] = await getDb()
    .select({
      application: applications,
      campaignTitle: campaigns.title,
      claimedAt: claims.claimedAt,
      parentUsername: users.username,
      parentPhone: users.phone,
    })
    .from(claims)
    .innerJoin(applications, eq(applications.id, claims.applicationId))
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .innerJoin(users, eq(users.id, applications.parentId))
    .where(
      and(
        eq(claims.applicationId, applicationId),
        eq(claims.volunteerId, volunteerId),
        isNull(claims.releasedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

// Who currently holds this application, for the admin detail page.
export async function getClaimHolder(applicationId: string): Promise<{
  claimedAt: Date;
  volunteerId: string;
  username: string | null;
  firstName: string | null;
  phone: string | null;
} | null> {
  const [row] = await getDb()
    .select({
      claimedAt: claims.claimedAt,
      volunteerId: users.id,
      username: users.username,
      firstName: users.firstName,
      phone: users.phone,
    })
    .from(claims)
    .innerJoin(users, eq(users.id, claims.volunteerId))
    .where(
      and(eq(claims.applicationId, applicationId), isNull(claims.releasedAt)),
    )
    .limit(1);
  return row ?? null;
}

// Find a volunteer to assign by hand.
//
// Searches EXISTING users only — there are no placeholder volunteers (Vital,
// Phase 6): claims.volunteer_id is a real FK, one human is one identity, and
// the contact stays fresh because users.username re-syncs from Telegram on
// every login. Someone who has never signed in cannot be assigned; the
// coordinator sends them a login link first.
export async function searchVolunteers(term: string, limit = 10) {
  const needle = `%${term.trim().replace(/^@/, "").toLowerCase()}%`;
  return getDb()
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
    })
    .from(users)
    .where(
      and(
        // Only people who have opted in as volunteers.
        sql`${users.role} @> ARRAY['volunteer']::text[]`,
        sql`(lower(coalesce(${users.username}, '')) like ${needle}
          or lower(coalesce(${users.firstName}, '')) like ${needle}
          or lower(coalesce(${users.lastName}, '')) like ${needle})`,
      ),
    )
    .orderBy(asc(users.username))
    .limit(limit);
}
