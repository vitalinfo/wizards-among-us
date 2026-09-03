import { count, desc } from "drizzle-orm";

import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";

// Read side of the append-only audit trail. Authorization lives in the page
// (isAdmin); this executes, it doesn't adjudicate.

export type AuditLogRow = typeof auditLogs.$inferSelect;

// Total, for the pager. A separate COUNT rather than counting returned rows —
// the whole point of paging is not to fetch them all.
export async function countAuditLogs(): Promise<number> {
  const [row] = await getDb().select({ total: count() }).from(auditLogs);
  return row?.total ?? 0;
}

// NEWEST first — the opposite of the moderation queue, and for the opposite
// reason. The queue is work to get through, so the oldest is the most urgent;
// the log is consulted to answer "what just happened?".
//
// id is the tiebreaker: without a total order, two rows sharing a created_at
// could swap between pages and one would never be seen. The same bug the
// moderation queue's ordering guards against, and far likelier here — several
// rows can be written inside one request.
export async function listAuditLogs(params: {
  limit: number;
  offset: number;
}): Promise<AuditLogRow[]> {
  return getDb()
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(params.limit)
    .offset(params.offset);
}
