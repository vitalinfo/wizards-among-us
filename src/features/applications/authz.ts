import type { applications, claims } from "@/db/schema";
import { intakeOpen } from "@/features/campaigns/authz";
import { hasRole, isAdmin, isUser, type MaybeActor } from "@/lib/actor";

// Types are imported with `import type` so this module stays free of any runtime
// DB/drizzle imports — the predicates are pure and safe to import anywhere.
type Application = typeof applications.$inferSelect;
type Claim = typeof claims.$inferSelect;

export function ownsApplication(
  actor: MaybeActor,
  application: Pick<Application, "parentId">,
): boolean {
  return isUser(actor) && actor.id === application.parentId;
}

// Edit lock (invariant): a parent may edit only while draft/submitted; admin
// approval locks it for the parent. Admins can always edit (operational override).
const PARENT_EDITABLE: readonly Application["status"][] = [
  "draft",
  "submitted",
];
export function canEditApplication(
  actor: MaybeActor,
  application: Pick<Application, "parentId" | "status">,
): boolean {
  if (isAdmin(actor)) {
    return true;
  }
  return (
    ownsApplication(actor, application) &&
    PARENT_EDITABLE.includes(application.status)
  );
}

export function canStartApplication(
  actor: MaybeActor,
  ctx: Parameters<typeof intakeOpen>[0],
): boolean {
  if (isAdmin(actor)) {
    return true;
  } // operational override
  return hasRole(actor, "parent") && intakeOpen(ctx);
}

// Sensitive child data — current_town, delivery_information, parent_name, the
// family's Telegram, and the contact field — is visible only to an admin, the
// owning parent, or the volunteer holding the ACTIVE claim (guardrail).
export function canViewSensitiveChildData(
  actor: MaybeActor,
  application: Pick<Application, "parentId">,
  claim: Pick<Claim, "volunteerId" | "releasedAt"> | null | undefined,
): boolean {
  if (isAdmin(actor)) {
    return true;
  }
  if (ownsApplication(actor, application)) {
    return true;
  }
  return (
    isUser(actor) &&
    !!claim &&
    claim.releasedAt === null &&
    claim.volunteerId === actor.id
  );
}

// Approve/reject applications, moderate reviews, export — admin only.
export function canModerateApplications(actor: MaybeActor): boolean {
  return isAdmin(actor);
}
