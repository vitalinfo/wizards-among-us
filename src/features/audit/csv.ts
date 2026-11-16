import { toCsv } from "@/features/applications/csv";
import { auditTypeLabel } from "@/features/audit/actionLabel";
import type { AuditLogRow } from "@/features/audit/adminQueries";

type AuditTranslator = {
  (key: string): string;
  has(key: string): boolean;
};

// The audit export's columns: the row as stored, with the two type columns in
// words (`admin.audit.actorType` / `.targetType`). A type without a label —
// an older build's, or one added without copy — is written as its code, never
// blanked: the trail is append-only, so the file has to read whatever is in it.
//
// The action stays the raw code with its ":detail" suffix — that suffix is
// the record of which file was viewed or which fields changed, and a label
// would drop it.
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

// `t` is scoped to `admin.audit`.
export function auditLogsToCsv(
  t: AuditTranslator,
  rows: readonly AuditLogRow[],
): string {
  return toCsv(
    HEADERS,
    rows.map((row) => [
      row.createdAt,
      auditTypeLabel(t, "actorType", row.actorType),
      row.actorId,
      row.actorLabel,
      row.ip,
      row.action,
      auditTypeLabel(t, "targetType", row.targetType),
      row.targetId,
    ]),
  );
}
