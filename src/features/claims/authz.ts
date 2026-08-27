import type { applications, claims } from "@/db/schema";
import { hasRole, isAdmin, type MaybeActor } from "@/lib/actor";

type Application = typeof applications.$inferSelect;
type Claim = typeof claims.$inferSelect;

export function isClaimed(
  claim: Pick<Claim, "releasedAt"> | null | undefined,
): boolean {
  return !!claim && claim.releasedAt === null;
}

export function canClaim(
  actor: MaybeActor,
  application: Pick<Application, "status">,
  activeClaim: Pick<Claim, "releasedAt"> | null | undefined,
): boolean {
  if (!isAdmin(actor) && !hasRole(actor, "volunteer")) {
    return false;
  }
  return application.status === "approved" && !isClaimed(activeClaim);
}

export function canBrowseChildren(actor: MaybeActor): boolean {
  return isAdmin(actor) || hasRole(actor, "volunteer");
}
