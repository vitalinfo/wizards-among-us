import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import type { AuditQuery } from "@/features/audit/listQuery";

// Read side of the append-only audit trail. Authorization lives in the page
// (isAdmin); this executes, it doesn't adjudicate.

export type AuditLogRow = typeof auditLogs.$inferSelect;

export type AuditFilter = Pick<AuditQuery, "action" | "targetId">;

// An action code without its ":detail" suffix — what the filter matches on, so
// `application.file_viewed` finds every file kind. split_part rather than LIKE:
// the codes are full of `_`, which LIKE reads as a wildcard.
const baseAction = sql<string>`split_part(${auditLogs.action}, ':', 1)`;

// One WHERE for the count and the page, so the pager can't disagree with the
// rows it pages. A target id is served by audit_logs_target_idx.
function auditWhere(filter: AuditFilter): SQL | undefined {
  return and(
    filter.action ? eq(baseAction, filter.action) : undefined,
    filter.targetId ? eq(auditLogs.targetId, filter.targetId) : undefined,
  );
}

// Total, for the pager. A separate COUNT rather than counting returned rows —
// the whole point of paging is not to fetch them all.
export async function countAuditLogs(filter: AuditFilter): Promise<number> {
  const [row] = await getDb()
    .select({ total: count() })
    .from(auditLogs)
    .where(auditWhere(filter));
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
  filter: AuditFilter;
  limit: number;
  offset: number;
}): Promise<AuditLogRow[]> {
  return getDb()
    .select()
    .from(auditLogs)
    .where(auditWhere(params.filter))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(params.limit)
    .offset(params.offset);
}

// The action filter's options: every action ever logged, read from the trail
// itself. A list kept in code would miss the codes built at runtime
// (`application.${decision}`) and any an older build wrote. It costs a scan of
// the table per page load — fine at today's volume; an index on the expression
// is the fix if it ever shows up.
export async function listAuditActions(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ action: baseAction })
    .from(auditLogs)
    .orderBy(asc(baseAction));
  return rows.map((row) => row.action);
}
