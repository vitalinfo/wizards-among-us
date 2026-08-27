import type { FileKind } from "@/db/enums";
import type { applications, claims } from "@/db/schema";
import { intakeOpen } from "@/features/campaigns/authz";
import { isAdmin, isUser, type MaybeActor } from "@/lib/actor";

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

// Any signed-in user may START an application — deliberately NOT gated on the
// `parent` role. Roles are capabilities earned by what someone does, and
// submitting an application is what earns `parent`; requiring it here would be
// circular and would lock out every first-time parent.
//
// It isn't gated against volunteers either: roles are combinable (users.role is
// a set), so a volunteer who also has a displaced child is a legitimate parent.
// Nothing sensitive exists at this point — an empty draft — and submit
// re-checks every gate.
export function canStartApplication(
  actor: MaybeActor,
  ctx: Parameters<typeof intakeOpen>[0],
): boolean {
  if (isAdmin(actor)) {
    return true;
  } // operational override
  return isUser(actor) && intakeOpen(ctx);
}

// Why a submit can be refused. Returned instead of a bare false so the UI can
// say which gate failed — a parent who can't submit deserves to know why.
export type SubmitBlockReason =
  | "not_owner"
  | "locked" // admin already approved/rejected it
  | "intake_closed" // no active campaign, or intake/kill switch off
  | "no_contact"; // no @username and no phone — nobody could reach them

// The full submit gate: ownership + edit lock + intake + contactability
// (Phase 4 decision — contact is required at SUBMIT, never at login).
//
// Returns the reason the submit is refused, or NULL when it may proceed. Pure,
// so the server action enforces it and the UI explains it from the same rules.
// Use canSubmitApplication() when you only need the boolean.
export function getSubmitBlockReason(
  actor: MaybeActor,
  application: Pick<Application, "parentId" | "status">,
  ctx: Parameters<typeof intakeOpen>[0] & { contactable: boolean },
): SubmitBlockReason | null {
  if (!isAdmin(actor) && !ownsApplication(actor, application)) {
    return "not_owner";
  }
  if (!PARENT_EDITABLE.includes(application.status) && !isAdmin(actor)) {
    return "locked";
  }
  if (!isAdmin(actor) && !intakeOpen(ctx)) {
    return "intake_closed";
  }
  if (!ctx.contactable) {
    // Applies to admins too: an application nobody can act on is not useful.
    return "no_contact";
  }
  return null;
}

export function canSubmitApplication(
  actor: MaybeActor,
  application: Pick<Application, "parentId" | "status">,
  ctx: Parameters<typeof getSubmitBlockReason>[2],
): boolean {
  return getSubmitBlockReason(actor, application, ctx) === null;
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

// Who may read an uploaded file. The KIND decides, not the application:
//
//   idp_certificate         — ADMINS ONLY. A state document about a child; a
//                             volunteer must never see it, not even the one
//                             holding the claim, and not even the parent's own
//                             claiming volunteer.
//   letter_photo            — same audience as the other sensitive fields:
//   child_with_letter_photo   admin, the owning parent, or the volunteer
//                             holding the ACTIVE claim.
//
// Separate from canViewSensitiveChildData so the certificate can never be
// widened by a change to the sensitive-field rule.
export function canViewApplicationFile(
  actor: MaybeActor,
  application: Pick<Application, "parentId">,
  claim: Pick<Claim, "volunteerId" | "releasedAt"> | null | undefined,
  kind: FileKind,
): boolean {
  if (kind === "idp_certificate") {
    return isAdmin(actor) || ownsApplication(actor, application);
  }
  return canViewSensitiveChildData(actor, application, claim);
}

// Approve/reject applications, moderate reviews, export — admin only.
export function canModerateApplications(actor: MaybeActor): boolean {
  return isAdmin(actor);
}
