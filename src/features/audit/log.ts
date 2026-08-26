import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { isAdmin, type Actor } from "@/lib/actor";

// Append-only audit trail (invariant: log every view/claim/export of child
// data, plus the actions that change an application's fate).
//
// actor_label is a SNAPSHOT — the row must stay readable after the actor is
// deleted, which is exactly when an audit trail matters most.
export async function recordAuditLog(entry: {
  actor: Actor;
  action: string;
  targetType: string;
  targetId?: string | null;
}): Promise<void> {
  const { actor, action, targetType, targetId = null } = entry;
  const actorLabel = isAdmin(actor)
    ? actor.email
    : (actor.username ?? actor.firstName ?? actor.id);

  try {
    await getDb().insert(auditLogs).values({
      actorId: actor.id,
      actorType: actor.kind,
      actorLabel,
      action,
      targetType,
      targetId,
    });
  } catch (error) {
    // Never let logging break the user's action — but make the failure loud in
    // the server log, because a silently missing audit trail is a real problem.
    console.error("recordAuditLog failed:", { action, targetType, error });
  }
}
