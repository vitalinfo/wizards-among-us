// The readable name of an action code, from `admin.audit.actions` — or the
// code itself when there is none. The trail is append-only and codes are added
// in code, so a missing label must degrade to the raw code, never to an error
// or a blank: an older build's code, or one added without copy, still reads.
//
// Takes the base code (no ":detail" suffix — see splitAuditAction). Only a
// well-formed `entity.verb` is looked up: the select can carry an arbitrary
// value from the url, and "application" alone would name a whole namespace.
const ACTION_CODE = /^[a-z_]+\.[a-z_]+$/;

export function auditActionLabel(
  t: { (key: string): string; has(key: string): boolean },
  action: string,
): string {
  const key = `actions.${action}`;
  return ACTION_CODE.test(action) && t.has(key) ? t(key) : action;
}
