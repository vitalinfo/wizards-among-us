type AuditTranslator = {
  (key: string): string;
  has(key: string): boolean;
  raw(key: string): unknown;
};

// The readable name of an action code, from `admin.audit.actions` — or the
// code itself when there is none. The trail is append-only and codes are added
// in code, so a missing label must degrade to the raw code, never to an error
// or a blank: an older build's code, or one added without copy, still reads.
//
// Takes the base code (no ":detail" suffix — see splitAuditAction). Only a
// well-formed `entity.verb` is looked up: the select can carry an arbitrary
// value from the url, and "application" alone would name a whole namespace.
const ACTION_CODE = /^[a-z_]+\.[a-z_]+$/;
const ENTITY = /^[a-z_]+$/;

export function auditActionLabel(t: AuditTranslator, action: string): string {
  const key = `actions.${action}`;
  return ACTION_CODE.test(action) && t.has(key) ? t(key) : action;
}

export type AuditActionGroup = {
  entity: string;
  label: string;
  options: { action: string; label: string }[];
};

// The action filter's options, grouped by entity (the code's first part).
// Groups follow the order of the `admin.audit.actions` tree in the messages;
// inside a group, options sort by label. An entity the tree doesn't know comes
// after the known ones, named by its code.
export function groupAuditActions(
  t: AuditTranslator,
  actions: readonly string[],
): AuditActionGroup[] {
  const order = Object.keys(t.raw("actions") as Record<string, unknown>);
  const rank = (entity: string) => {
    const at = order.indexOf(entity);
    return at === -1 ? order.length : at;
  };

  const groups = new Map<string, AuditActionGroup["options"]>();
  for (const action of actions) {
    const entity = action.split(".")[0];
    const options = groups.get(entity) ?? [];
    options.push({ action, label: auditActionLabel(t, action) });
    groups.set(entity, options);
  }

  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([entity, options]) => {
      const key = `actionGroups.${entity}`;
      return {
        entity,
        label: ENTITY.test(entity) && t.has(key) ? t(key) : entity,
        options: options.sort((a, b) => a.label.localeCompare(b.label, "uk")),
      };
    });
}
