import type { applications, claims } from "@/db/schema";
import { hasRole, isAdmin, isUser, type MaybeActor } from "@/lib/actor";

type Application = typeof applications.$inferSelect;
type Claim = typeof claims.$inferSelect;

export function isClaimed(
  claim: Pick<Claim, "releasedAt"> | null | undefined,
): boolean {
  return !!claim && claim.releasedAt === null;
}

// Held right now by a volunteer other than this one — what someone lands on
// when they open a card from a list drawn before another volunteer claimed it.
export function isHeldByAnother(
  userId: string,
  claim: Pick<Claim, "volunteerId" | "releasedAt"> | null | undefined,
): boolean {
  return !!claim && isClaimed(claim) && claim.volunteerId !== userId;
}

// Why a claim can be refused. Returned instead of a bare false so the UI can
// say which gate failed — mirrors getSubmitBlockReason on the parent side.
export type ClaimBlockReason =
  | "not_volunteer" // hasn't opted in on /volunteer yet
  | "not_available" // not approved, or someone already holds it
  | "no_contact"; // no @username and no phone — the family couldn't reach them

// The full claim gate. Contactability is part of it (Phase 6 decision): a
// volunteer with no @username and no phone is someone the family cannot reach,
// and a child must never be held by an unreachable person. This mirrors the
// parent side, where the same rule is enforced at submit.
//
// Returns the reason a claim is refused, or NULL when it may proceed.
export function getClaimBlockReason(
  actor: MaybeActor,
  application: Pick<Application, "status">,
  activeClaim: Pick<Claim, "releasedAt"> | null | undefined,
  ctx: { contactable: boolean },
): ClaimBlockReason | null {
  if (!isAdmin(actor) && !hasRole(actor, "volunteer")) {
    return "not_volunteer";
  }
  if (application.status !== "approved" || isClaimed(activeClaim)) {
    return "not_available";
  }
  // Applies to admins too — an admin assigning by hand must not be able to put
  // a child with a volunteer nobody can contact. Here `contactable` describes
  // the VOLUNTEER being assigned, not the actor doing the assigning.
  if (!ctx.contactable) {
    return "no_contact";
  }
  return null;
}

export function canClaim(
  actor: MaybeActor,
  application: Pick<Application, "status">,
  activeClaim: Pick<Claim, "releasedAt"> | null | undefined,
  ctx: { contactable: boolean },
): boolean {
  return getClaimBlockReason(actor, application, activeClaim, ctx) === null;
}

export function canBrowseChildren(actor: MaybeActor): boolean {
  return isAdmin(actor) || hasRole(actor, "volunteer");
}

// Releasing is ADMIN ONLY (Phase 6 decision). A volunteer who cannot follow
// through contacts the coordinator instead of quietly returning the child to
// the pool, so a human sees every drop-out.
export function canReleaseClaim(actor: MaybeActor): boolean {
  return isAdmin(actor);
}

// Assigning a volunteer by hand is an admin act; it goes through the same
// transaction and unique index as a self-claim (invariant).
export function canAssignVolunteer(actor: MaybeActor): boolean {
  return isAdmin(actor);
}

// The optional `processed` mark (Vital): only the volunteer holding the active
// claim, and only on a `claimed` application — or, to take it off again, a
// `processed` one. Never on a fulfilled child; the family has closed that.
export function canToggleProcessed(
  actor: MaybeActor,
  application: Pick<Application, "status">,
  claim: Pick<Claim, "volunteerId" | "releasedAt"> | null | undefined,
): boolean {
  return (
    isUser(actor) &&
    !!claim &&
    isClaimed(claim) &&
    claim.volunteerId === actor.id &&
    (application.status === "claimed" || application.status === "processed")
  );
}
