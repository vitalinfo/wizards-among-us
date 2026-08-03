import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

export type ActiveCampaign = { id: string; title: string };

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
