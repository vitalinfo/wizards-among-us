import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

export type ActiveCampaign = { id: string; title: string };

// Everything the intake gate and submit validation need about the live campaign:
// its status/accepting flags, its type (which type_fields schema applies) and
// its gift budget ceiling. Separate from getActiveCampaign, which the public
// landing uses and which deliberately returns as little as possible.
export type ActiveCampaignForIntake = {
  id: string;
  title: string;
  type: (typeof campaigns.$inferSelect)["type"];
  status: (typeof campaigns.$inferSelect)["status"];
  acceptingApplications: boolean;
  giftPriceCap: string | null;
};

export async function getActiveCampaignForIntake(): Promise<ActiveCampaignForIntake | null> {
  const [row] = await getDb()
    .select({
      id: campaigns.id,
      title: campaigns.title,
      type: campaigns.type,
      status: campaigns.status,
      acceptingApplications: campaigns.acceptingApplications,
      giftPriceCap: campaigns.giftPriceCap,
    })
    .from(campaigns)
    .where(eq(campaigns.status, "active"))
    .limit(1);
  return row ?? null;
}

// The single active campaign (invariant: at most one), or null when there's
// none. Resilient by design — the public landing must render even if the
// database is unavailable, so a failure returns null (no badge) rather than
// throwing.
export async function getActiveCampaign(): Promise<ActiveCampaign | null> {
  try {
    const [row] = await getDb()
      .select({ id: campaigns.id, title: campaigns.title })
      .from(campaigns)
      .where(eq(campaigns.status, "active"))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("getActiveCampaign failed:", error);
    return null;
  }
}
