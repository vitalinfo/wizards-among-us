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
import { applications, claims, users } from "@/db/schema";
import { toBrowseCard, type BrowseCard } from "@/features/applications/mappers";

// Volunteer-facing data access. Authorization lives in the actions/pages
// (canBrowseChildren / canClaim); these execute, they don't adjudicate.

export type BrowseFilters = {
  campaignId: string;
  // Matches home_region: the region the family left.
  region?: UkraineRegion;
  minAge?: number;
  maxAge?: number;
  // undefined = both. Claimed children stay visible (Phase 6 decision) so a
  // volunteer can see how the campaign is going.
  availability?: "available" | "claimed";
};

// A browse row is the redacted card plus whether it is taken. It deliberately
// carries NOTHING beyond toBrowseCard's projection — the sensitive fields are
// dropped at the data layer, so a card physically cannot leak an address to the
// client (child-data invariant, tier 1).
export type BrowseRow = BrowseCard & { claimed: boolean };

// Only these two statuses are browsable: `approved` is available, `claimed` is
// taken. A draft/submitted/rejected application must never appear.
const BROWSABLE = sql`${applications.status} in ('approved','claimed')`;

function browseConditions(filters: BrowseFilters) {
  const activeClaim = sql`exists (
    select 1 from ${claims}
    where ${claims.applicationId} = ${applications.id}
      and ${claims.releasedAt} is null
  )`;
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
    filters.availability === "available"
      ? sql`not ${activeClaim}`
      : filters.availability === "claimed"
        ? activeClaim
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
  const rows = await getDb()
    .select({
      application: applications,
      claimId: claims.id,
    })
    .from(applications)
    .leftJoin(
      claims,
      and(eq(claims.applicationId, applications.id), isNull(claims.releasedAt)),
    )
    .where(and(...browseConditions(filters)))
    // Oldest approval first so the longest-waiting child is seen first, with id
    // as the tiebreaker — without a total order, rows can swap between pages
    // and one would never be shown.
    .orderBy(asc(applications.updatedAt), asc(applications.id))
    .limit(filters.limit)
    .offset(filters.offset);

  return rows.map((row) => ({
    ...toBrowseCard(row.application),
    claimed: row.claimId !== null,
  }));
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

// What a volunteer sees for the children they hold: the full sensitive set,
// because they are the claiming volunteer (tier 2). Scoped to their own claims.
export async function listMyClaims(volunteerId: string, campaignId: string) {
  return getDb()
    .select({
      application: applications,
      claimedAt: claims.claimedAt,
      parentUsername: users.username,
      parentPhone: users.phone,
    })
    .from(claims)
    .innerJoin(applications, eq(applications.id, claims.applicationId))
    .innerJoin(users, eq(users.id, applications.parentId))
    .where(
      and(
        eq(claims.volunteerId, volunteerId),
        isNull(claims.releasedAt),
        eq(applications.campaignId, campaignId),
      ),
    )
    .orderBy(asc(claims.claimedAt));
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
