import { toCsv } from "@/features/applications/csv";
import type { AuditLogRow } from "@/features/audit/adminQueries";

// The audit export's columns: the row as stored, nothing derived. The action
// stays the raw code with its ":detail" suffix — that suffix is the record of
// which file was viewed or which fields changed, and a label would drop it.
const HEADERS = [
  "created_at",
  "actor_type",
  "actor_id",
  "actor_label",
  "ip",
  "action",
  "target_type",
  "target_id",
] as const;

export function auditLogsToCsv(rows: readonly AuditLogRow[]): string {
  return toCsv(
    HEADERS,
    rows.map((row) => [
      row.createdAt,
      row.actorType,
      row.actorId,
      row.actorLabel,
      row.ip,
      row.action,
      row.targetType,
      row.targetId,
    ]),
  );
}
