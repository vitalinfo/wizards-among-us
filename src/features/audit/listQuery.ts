// The audit log view, parsed out of the url — same shape as the moderation
// queue and the people list, so each view is addressable and a "back" link
// returns to it.

export const AUDIT_PAGE_SIZE = 50;

export type AuditQuery = {
  page: number;
};

export function parseAuditQuery(params: { page?: string }): AuditQuery {
  const page = Number(params.page);
  // Anything unparseable is page 1 rather than an error — a bad page number
  // must never be able to blank the log.
  return { page: Number.isInteger(page) && page >= 1 ? page : 1 };
}

export function auditPageCount(total: number): number {
  // Always at least one page, so an empty log still renders coherently.
  return Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
}

export function auditHref(page: number): string {
  return page > 1 ? `/admin/audit?page=${page}` : "/admin/audit";
}

// An action code carries an optional ":detail" suffix — the file kind that was
// viewed (`application.file_viewed:idp_certificate`), or the field names an
// admin changed (`application.updated_by_admin:childName,giftPrice`). Split so
// the action itself stays scannable down a column.
//
// Only the FIRST colon splits: the detail is a comma-separated list that may
// itself contain one, and swallowing part of it would silently truncate the
// record of what changed.
export function splitAuditAction(action: string): [string, string | null] {
  const at = action.indexOf(":");
  return at === -1
    ? [action, null]
    : [action.slice(0, at), action.slice(at + 1)];
}
