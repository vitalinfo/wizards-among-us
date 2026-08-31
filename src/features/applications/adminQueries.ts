import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { ApplicationStatus } from "@/db/enums";
import { applications, campaigns, users } from "@/db/schema";

// Admin-side application data access. Authorization lives in the server actions
// (requireAdmin); these execute, they don't adjudicate.

type Application = typeof applications.$inferSelect;

export type ModerationRow = {
  id: string;
  childName: string | null;
  childAge: number | null;
  currentRegion: Application["currentRegion"];
  giftDescription: string | null;
  giftPrice: string | null;
  status: Application["status"];
  submittedAt: Date | null;
  campaignTitle: string;
};

// The queue. Ordered OLDEST FIRST by submission: we promise parents a review
// within two days, so the one waiting longest is the one to look at next.
// Newest-first would quietly starve exactly the applications that are late.
export async function listForModeration(filter: {
  campaignId?: string;
  status?: ApplicationStatus;
}): Promise<ModerationRow[]> {
  const conditions = [
    filter.campaignId
      ? eq(applications.campaignId, filter.campaignId)
      : undefined,
    filter.status ? eq(applications.status, filter.status) : undefined,
  ].filter(Boolean);

  return getDb()
    .select({
      id: applications.id,
      childName: applications.childName,
      childAge: applications.childAge,
      currentRegion: applications.currentRegion,
      giftDescription: applications.giftDescription,
      giftPrice: applications.giftPrice,
      status: applications.status,
      submittedAt: applications.submittedAt,
      campaignTitle: campaigns.title,
    })
    .from(applications)
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(applications.submittedAt), desc(applications.updatedAt));
}

// Full detail for review: the application, its campaign, and the parent's live
// contact. An admin is the only actor who may see all of this at once.
export async function getApplicationForAdmin(id: string): Promise<{
  application: Application;
  campaignTitle: string;
  campaignType: (typeof campaigns.$inferSelect)["type"];
  // Needed by the admin edit form: the cap is per campaign, applied in zod.
  giftPriceCap: string | null;
  parent: {
    username: string | null;
    phone: string | null;
    firstName: string | null;
  };
} | null> {
  const [row] = await getDb()
    .select({
      application: applications,
      campaignTitle: campaigns.title,
      campaignType: campaigns.type,
      giftPriceCap: campaigns.giftPriceCap,
      username: users.username,
      phone: users.phone,
      firstName: users.firstName,
    })
    .from(applications)
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .innerJoin(users, eq(users.id, applications.parentId))
    .where(eq(applications.id, id))
    .limit(1);

  if (!row) {
    return null;
  }
  return {
    application: row.application,
    campaignTitle: row.campaignTitle,
    campaignType: row.campaignType,
    giftPriceCap: row.giftPriceCap,
    parent: {
      username: row.username,
      phone: row.phone,
      firstName: row.firstName,
    },
  };
}

// Admin edit (operational override). Writes only the content columns: status,
// campaign, parent and the decision fields are not editable here, so a typo fix
// can never move an application through the workflow as a side effect.
//
// Values are already validated by adminApplicationEditSchema; `undefined` means
// "not provided" and is written as NULL, which only a draft can produce (the
// schema requires completeness for everything past draft).
export async function updateApplicationByAdmin(
  id: string,
  values: {
    parentName?: string;
    childName?: string;
    childAge?: number;
    homeTown?: string;
    homeRegion?: Application["homeRegion"];
    currentTown?: string;
    currentRegion?: Application["currentRegion"];
    displacedYear?: number;
    familyStory?: string;
    giftDescription?: string;
    giftPrice?: number;
    deliveryInformation?: string;
    socialMediaConsent?: boolean;
    typeFields?: Record<string, unknown> | null;
  },
): Promise<void> {
  await getDb()
    .update(applications)
    .set({
      parentName: values.parentName ?? null,
      childName: values.childName ?? null,
      childAge: values.childAge ?? null,
      homeTown: values.homeTown ?? null,
      homeRegion: values.homeRegion ?? null,
      currentTown: values.currentTown ?? null,
      currentRegion: values.currentRegion ?? null,
      displacedYear: values.displacedYear ?? null,
      familyStory: values.familyStory ?? null,
      giftDescription: values.giftDescription ?? null,
      // numeric() columns take a string; undefined must become NULL, not "null".
      giftPrice:
        values.giftPrice === undefined ? null : String(values.giftPrice),
      deliveryInformation: values.deliveryInformation ?? null,
      socialMediaConsent: values.socialMediaConsent ?? null,
      typeFields: values.typeFields ?? null,
    })
    .where(eq(applications.id, id));
}

// Approve / reject. The status guard in the WHERE clause means only a SUBMITTED
// application can be decided: two admins reviewing the same queue can't both
// land a decision, and a decided application can't be flipped by a stale tab.
// Returns false when nothing changed.
export async function decideApplication(
  id: string,
  decision: "approved" | "rejected",
  rejectionNote: string | null,
): Promise<boolean> {
  const rows = await getDb()
    .update(applications)
    .set({ status: decision, rejectionNote })
    .where(and(eq(applications.id, id), eq(applications.status, "submitted")))
    .returning({ id: applications.id });
  return rows.length > 0;
}
