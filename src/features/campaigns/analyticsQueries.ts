import { and, asc, count, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, auditLogs } from "@/db/schema";
import { timeZone } from "@/i18n/config";

import { STATE_EVENTS, type StateEvent } from "./analytics";
import { REGION_COUNTED_STATUSES, type RegionCount } from "./regionCounts";

// Admin-only read behind the analytics page: status changes, never a row of
// child data. Authorization is the page's (isAdmin); this executes.

const ACTIONS = Object.keys(STATE_EVENTS) as (keyof typeof STATE_EVENTS)[];

export async function listCampaignStateEvents(
  campaignId: string,
): Promise<StateEvent[]> {
  const rows = await getDb()
    .select({
      applicationId: applications.id,
      action: auditLogs.action,
      day: sql<string>`to_char((${auditLogs.createdAt} at time zone ${timeZone})::date, 'YYYY-MM-DD')`,
    })
    .from(auditLogs)
    .innerJoin(applications, eq(applications.id, auditLogs.targetId))
    .where(
      and(
        eq(auditLogs.targetType, "application"),
        inArray(auditLogs.action, ACTIONS),
        eq(applications.campaignId, campaignId),
      ),
    )
    .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));

  return rows.map(({ applicationId, action, day }) => ({
    applicationId,
    day,
    state: STATE_EVENTS[action as keyof typeof STATE_EVENTS],
  }));
}

// How many of the campaign's applications came from each home region. Grouped
// in SQL, so no application row leaves the database.
export async function countCampaignApplicationsByRegion(
  campaignId: string,
): Promise<RegionCount[]> {
  const rows = await getDb()
    .select({ region: applications.homeRegion, count: count() })
    .from(applications)
    .where(
      and(
        eq(applications.campaignId, campaignId),
        inArray(applications.status, REGION_COUNTED_STATUSES),
        isNotNull(applications.homeRegion),
      ),
    )
    .groupBy(applications.homeRegion);

  return rows.flatMap(({ region, count }) =>
    region ? [{ region, count }] : [],
  );
}
