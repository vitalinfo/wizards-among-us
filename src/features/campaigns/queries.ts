import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { campaigns } from "@/db/schema";

// Everything the intake gate and submit validation need about the live campaign:
// its status/accepting flags, its type (which type_fields schema applies) and
// its gift budget ceiling. Separate from getCampaignStates, which the public
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

// What the landing page needs in order to say whether an initiative is open.
// One entry per campaign TYPE we have ever run:
//
//   "active"    a campaign of that type is running now  → «Відбувається набір»
//   "inactive"  we have run one, none is running now    → «Набір завершено»
//   absent      we have never run one                   → «Набір ще не відкрито»
//
// The three states are the design's, and they are the reason this is a query
// rather than a flag in the copy: "which initiative is open" changes several
// times a year and nobody would remember to edit a message file for it.
//
// selectDistinct over the whole table rather than an aggregate: `campaigns`
// holds a handful of rows (one per campaign we have ever run), and the plain
// query needs no raw SQL to be correct.
//
// Resilient by design — the landing must render even if the database is
// unavailable, so a failure returns an empty map: every initiative then reads
// as not yet open, which is the safe way to be wrong.
export type CampaignStates = Partial<
  Record<(typeof campaigns.$inferSelect)["type"], "active" | "inactive">
>;

export async function getCampaignStates(): Promise<CampaignStates> {
  try {
    const rows = await getDb()
      .selectDistinct({ type: campaigns.type, status: campaigns.status })
      .from(campaigns);

    const states: CampaignStates = {};
    for (const row of rows) {
      // "active" wins over "inactive" whatever order the rows arrive in.
      if (row.status === "active" || states[row.type] === undefined) {
        states[row.type] = row.status === "active" ? "active" : "inactive";
      }
    }
    return states;
  } catch (error) {
    console.error("getCampaignStates failed:", error);
    return {};
  }
}

// The campaign an application belongs to — NOT necessarily the active one. An
// application from a previous campaign must be read against its OWN campaign's
// type and budget, or a returning parent would see the current campaign's form
// over last year's answers.
export async function getCampaignById(
  id: string,
): Promise<ActiveCampaignForIntake | null> {
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
    .where(eq(campaigns.id, id))
    .limit(1);
  return row ?? null;
}
