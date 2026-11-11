import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, auditLogs } from "@/db/schema";
import { timeZone } from "@/i18n/config";

import { STATE_EVENTS, type StateEvent } from "./analytics";

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
