import { and, asc, count, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import type { UkraineRegion } from "@/db/enums";
import { applications, claims, users } from "@/db/schema";
import { toBrowseCard, type BrowseCard } from "@/features/applications/mappers";

// Volunteer-facing data access. Authorization lives in the actions/pages
// (canBrowseChildren / canClaim); these execute, they don't adjudicate.

export type BrowseFilters = {
  campaignId: string;
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
    filters.region ? eq(applications.currentRegion, filters.region) : undefined,
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

// Claim, atomically.
//
// The unique index on claims.application_id is the real guard: two volunteers
// pressing the button at the same instant both reach here, and exactly one
// INSERT survives. The ON CONFLICT branch handles re-claiming an application
// whose previous claim was RELEASED — that row already exists, so it is an
// UPDATE (the Phase 1 decision: one claim row per application, reused).
//
// `setWhere` is what makes it safe: the update only applies to a row that is
// actually released, so a conflict against an ACTIVE claim changes nothing and
// returns no rows — which we report as "taken" rather than silently stealing a
// child from another volunteer.
//
// The application's status moves in the SAME transaction: a claim that didn't
// flip the status would leave the child visible as available.
export async function claimApplication(
  applicationId: string,
  volunteerId: string,
): Promise<ClaimOutcome> {
  return getDb().transaction(async (tx) => {
    const inserted = await tx
      .insert(claims)
      .values({ applicationId, volunteerId })
      .onConflictDoUpdate({
        target: claims.applicationId,
        set: { volunteerId, claimedAt: new Date(), releasedAt: null },
        setWhere: sql`${claims.releasedAt} is not null`,
      })
      .returning({ id: claims.id });

    if (inserted.length === 0) {
      return "taken";
    }

    // Guarded on `approved` for the same reason the moderation decision is:
    // two requests must not both believe they moved it.
    const updated = await tx
      .update(applications)
      .set({ status: "claimed" })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.status, "approved"),
        ),
      )
      .returning({ id: applications.id });

    if (updated.length === 0) {
      // The application was not claimable after all (moderated in between).
      // Roll the claim back rather than leaving a claim on a non-approved row.
      tx.rollback();
    }
    return "claimed";
  });
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
