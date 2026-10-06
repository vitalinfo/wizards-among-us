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

// What the public pages need in order to say whether an initiative is open:
// one entry per campaign TYPE we have ever had a row for.
//
// Carries the campaign's own STATUS rather than a two-way open/closed flag.
// It used to collapse everything that was not `active` into "inactive", which
// read as «Набір завершено» — and campaigns are CREATED as `draft`, so
// preparing next year's Миколай told every family on the landing page that
// they had missed it. `draft` and `archived` are different claims and the
// public copy says different things about them.
//
// `acceptingApplications` rides along because the pill and the button next to
// it have to agree: a campaign can be live while new submissions are paused,
// and a page that says «Відбувається набір» over a link into a form that
// refuses the parent is worse than one that says nothing.
//
// PRECEDENCE when a type has several rows: active > draft > archived. A type
// with last year archived and next year drafted is "not open yet", not
// "finished" — the next one is coming.
//
// selectDistinct over the whole table rather than an aggregate: `campaigns`
// holds a handful of rows (one per campaign we have ever run), and the plain
// query needs no raw SQL to be correct.
//
// Resilient by design — the landing must render even if the database is
// unavailable, so a failure returns an empty map: every initiative then reads
// as not yet open, which is the safe way to be wrong.
export type CampaignState = {
  status: (typeof campaigns.$inferSelect)["status"];
  acceptingApplications: boolean;
};

export type CampaignStates = Partial<
  Record<(typeof campaigns.$inferSelect)["type"], CampaignState>
>;

const STATUS_RANK = { active: 3, draft: 2, archived: 1 } as const;

export async function getCampaignStates(): Promise<CampaignStates> {
  try {
    const rows = await getDb()
      .selectDistinct({
        type: campaigns.type,
        status: campaigns.status,
        acceptingApplications: campaigns.acceptingApplications,
      })
      .from(campaigns);

    const states: CampaignStates = {};
    for (const row of rows) {
      const held = states[row.type];
      // Highest-ranking status wins, whatever order the rows arrive in.
      if (
        held === undefined ||
        STATUS_RANK[row.status] > STATUS_RANK[held.status]
      ) {
        states[row.type] = {
          status: row.status,
          acceptingApplications: row.acceptingApplications,
        };
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
