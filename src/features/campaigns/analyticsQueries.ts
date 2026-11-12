import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  sql,
  type Column,
} from "drizzle-orm";

import { getDb } from "@/db";
import { applications, auditLogs } from "@/db/schema";
import { timeZone } from "@/i18n/config";

import { STATE_EVENTS, type StateEvent } from "./analytics";
import { BREAKDOWN_STATUSES, type Count } from "./breakdowns";

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

// The campaign's applications split by one field, for the bar charts. Grouped
// in SQL, so no application row leaves the database. A row with the field
// empty is not counted.
function countedBy(campaignId: string, column: Column) {
  return and(
    eq(applications.campaignId, campaignId),
    inArray(applications.status, BREAKDOWN_STATUSES),
    isNotNull(column),
  );
}

function present<K>(rows: { value: K | null; count: number }[]): Count<K>[] {
  return rows.flatMap(({ value, count }) =>
    value === null ? [] : [{ value, count }],
  );
}

export async function countCampaignApplicationsByRegion(campaignId: string) {
  return present(
    await getDb()
      .select({ value: applications.homeRegion, count: count() })
      .from(applications)
      .where(countedBy(campaignId, applications.homeRegion))
      .groupBy(applications.homeRegion),
  );
}

export async function countCampaignApplicationsByAge(campaignId: string) {
  return present(
    await getDb()
      .select({ value: applications.childAge, count: count() })
      .from(applications)
      .where(countedBy(campaignId, applications.childAge))
      .groupBy(applications.childAge),
  );
}

export async function countCampaignApplicationsByGender(campaignId: string) {
  return present(
    await getDb()
      .select({ value: applications.childGender, count: count() })
      .from(applications)
      .where(countedBy(campaignId, applications.childGender))
      .groupBy(applications.childGender),
  );
}
