import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { CampaignType } from "@/db/enums";
import { campaigns } from "@/db/schema";

// Admin-side campaign data access. Authorization happens in the server actions
// (requireAdmin); these functions execute, they don't adjudicate.

export type AdminCampaign = typeof campaigns.$inferSelect;

export async function listCampaigns(): Promise<AdminCampaign[]> {
  return getDb().select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getAdminCampaign(
  id: string,
): Promise<AdminCampaign | null> {
  const [row] = await getDb()
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);
  return row ?? null;
}

export async function createCampaign(values: {
  type: CampaignType;
  title: string;
  description: string | null;
  giftPriceCap: string | null;
}): Promise<string> {
  // Always born as a draft — activating is a separate, deliberate act, so
  // creating a campaign can never accidentally open intake to the public.
  const [row] = await getDb()
    .insert(campaigns)
    .values({ ...values, status: "draft" })
    .returning({ id: campaigns.id });
  return row.id;
}

// Editing the descriptive fields. The TYPE is deliberately not here: it
// decides which form a parent fills in and how type_fields is validated, so
// changing it after applications exist would orphan every one of them. The
// action allows a type change only while the campaign is still a draft, which
// is the only state in which it can have no applications.
export async function updateCampaign(
  id: string,
  values: {
    title: string;
    description: string | null;
    giftPriceCap: string | null;
  },
): Promise<void> {
  await getDb().update(campaigns).set(values).where(eq(campaigns.id, id));
}

export async function updateDraftCampaignType(
  id: string,
  type: CampaignType,
): Promise<void> {
  // Guarded in SQL, not only in the action: a draft that was activated between
  // the read and the write must not have its type rewritten.
  await getDb()
    .update(campaigns)
    .set({ type })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, "draft")));
}

// Activating is the one operation that can fail on a constraint: a partial
// unique index allows only ONE active campaign. We archive the incumbent in the
// same transaction rather than asking the admin to do it in the right order —
// getting it wrong would either hit a raw constraint error or leave a window
// with no active campaign at all.
export async function activateCampaign(id: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx
      .update(campaigns)
      .set({ status: "archived", archivedAt: new Date() })
      .where(eq(campaigns.status, "active"));
    await tx
      .update(campaigns)
      .set({ status: "active", archivedAt: null })
      .where(eq(campaigns.id, id));
  });
}

export async function archiveCampaign(id: string): Promise<void> {
  await getDb()
    .update(campaigns)
    .set({ status: "archived", archivedAt: new Date() })
    .where(eq(campaigns.id, id));
}

// Intake toggle: a campaign stays live (volunteers claiming, families
// confirming) while NEW parent submissions are closed. A normal phase, not an
// emergency — that's the kill switch below.
export async function setAcceptingApplications(
  id: string,
  accepting: boolean,
): Promise<void> {
  await getDb()
    .update(campaigns)
    .set({ acceptingApplications: accepting })
    .where(eq(campaigns.id, id));
}
