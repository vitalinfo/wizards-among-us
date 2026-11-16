import { csvTime, toCsv } from "@/features/applications/csv";
import {
  auditActionLabel,
  auditTypeLabel,
  type AuditLabelTranslator,
} from "@/features/audit/actionLabel";
import type { AuditLogRow } from "@/features/audit/adminQueries";
import { splitAuditAction } from "@/features/audit/listQuery";

// The audit export's columns, named in the file from `admin.audit.exportColumns`
// (these codes are only the keys): the row as stored, with the action and the
// two type columns in words (`admin.audit.actions` / `.actorType` /
// `.targetType`).
// A code without a label — an older build's, or one added without copy — is
// written as itself, never blanked: the trail is append-only, so the file has
// to read whatever is in it.
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

// The action's label, with its ":detail" suffix after it — the suffix is the
// record of which file was viewed or which fields changed, and has no copy:
// «Анкету змінено адміністратором: childName,giftPrice». A code without a
// label is written exactly as stored.
function actionCell(t: AuditLabelTranslator, stored: string): string {
  const [action, detail] = splitAuditAction(stored);
  const label = auditActionLabel(t, action);
  if (label === action) {
    return stored;
  }
  return detail ? `${label}: ${detail}` : label;
}

// `t` is scoped to `admin.audit`.
export function auditLogsToCsv(
  t: AuditLabelTranslator,
  rows: readonly AuditLogRow[],
): string {
  return toCsv(
    HEADERS.map((column) => t(`exportColumns.${column}`)),
    rows.map((row) => [
      csvTime(row.createdAt),
      auditTypeLabel(t, "actorType", row.actorType),
      row.actorId,
      row.actorLabel,
      row.ip,
      actionCell(t, row.action),
      auditTypeLabel(t, "targetType", row.targetType),
      row.targetId,
    ]),
  );
}
