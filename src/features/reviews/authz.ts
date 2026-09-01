import type { applications } from "@/db/schema";
import { isAdmin, isUser, type MaybeActor } from "@/lib/actor";

type Application = typeof applications.$inferSelect;

// Why a review can't be left, so the UI explains instead of hiding the form.
export type ReviewBlockReason =
  | "not_owner"
  | "not_fulfilled" // the wish isn't complete yet (Vital, Phase 7)
  | "already_reviewed";

export function getReviewBlockReason(
  actor: MaybeActor,
  application: Pick<Application, "parentId" | "status">,
  ctx: { alreadyReviewed: boolean },
): ReviewBlockReason | null {
  if (!isUser(actor) || actor.id !== application.parentId) {
    return "not_owner";
  }
  // Only once the wish is actually complete (Vital, Phase 7): a review means
  // something because the experience finished. The trade-off is that a family
  // whose gift never arrives has no way to say so here — that goes to the
  // coordinator instead.
  if (application.status !== "fulfilled") {
    return "not_fulfilled";
  }
  // One review per application, so a single family can't flood the page.
  if (ctx.alreadyReviewed) {
    return "already_reviewed";
  }
  return null;
}

export function canLeaveReview(
  actor: MaybeActor,
  application: Pick<Application, "parentId" | "status">,
  ctx: { alreadyReviewed: boolean },
): boolean {
  return getReviewBlockReason(actor, application, ctx) === null;
}

// Publishing decides what appears on a public page, so it is admin-only —
// the deferred "review moderation" from Phase 5.
export function canModerateReviews(actor: MaybeActor): boolean {
  return isAdmin(actor);
}
