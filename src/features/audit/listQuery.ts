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

// Where a row's TARGET can be opened, or null when there is nowhere to go.
//
// The trail records what happened to a thing; without this it records the
// thing's uuid and leaves you to paste it somewhere. Four of the five target
// types have a page:
//
//   application → the moderation detail page
//   user        → that person's page
//   campaign    → the campaign edit page (the only per-campaign screen)
//   review      → the reviews LIST — there is no per-review page, and landing
//                 on the right surface beats landing nowhere
//   settings    → nothing to open, and its rows carry no target id anyway
//
// A link can point at something since deleted; that 404s, which is the honest
// answer. An audit row outliving its subject is the normal case, not a bug —
// it is why actor_label is a snapshot.
export function auditTargetHref(
  targetType: string,
  targetId: string | null,
): string | null {
  if (targetType === "review") {
    return "/admin/reviews";
  }
  if (targetId === null) {
    return null;
  }
  switch (targetType) {
    case "application":
      return `/admin/applications/${targetId}`;
    case "user":
      return `/admin/users/${targetId}`;
    case "campaign":
      return `/admin/campaigns/${targetId}/edit`;
    default:
      // An unknown target type is not an error — the trail is append-only and
      // older rows may name things this build has never heard of.
      return null;
  }
}

// Where the ACTOR can be opened. Admins have no page of their own (there is no
// admin management UI), so only a user resolves.
export function auditActorHref(
  actorType: string,
  actorId: string,
): string | null {
  return actorType === "user" ? `/admin/users/${actorId}` : null;
}
