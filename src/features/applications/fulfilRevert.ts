import { HELD_STATUSES } from "@/db/enums";
import type { ApplicationStatus } from "@/db/enums";

// Undoing a parent's mistaken «отримали» (`pnpm fulfilment:revert`). The pure
// half: which status the application goes back to, and whether it may go back
// at all. The writes are in fulfilRevertQueries.ts.

export type HeldStatus = (typeof HELD_STATUSES)[number];

// The volunteer's optional «оброблено» mark is the one thing `fulfilled`
// overwrote: there is no status-history column, only the audit trail. So the
// status before fulfilment is replayed from the application's audit actions,
// oldest first, up to the LAST `application.fulfilled` (an application
// reverted once and confirmed again must use the second one).
//
// A new claim — by a volunteer or an admin's assignment — starts at `claimed`,
// and an admin's takeover drops the previous volunteer's mark (assignClaim), so
// both reset it. Nothing seen means `claimed`, the status every held
// application starts at.
export function statusBeforeFulfilment(actions: readonly string[]): HeldStatus {
  const lastFulfilled = actions.lastIndexOf("application.fulfilled");
  const before =
    lastFulfilled === -1 ? actions : actions.slice(0, lastFulfilled);
  let status: HeldStatus = "claimed";
  for (const action of before) {
    if (action === "claim.processed") {
      status = "processed";
    } else if (
      action === "claim.unprocessed" ||
      action === "claim.created" ||
      action === "claim.assigned_by_admin"
    ) {
      status = "claimed";
    }
  }
  return status;
}

export type FulfilRevertBlocker = "not_fulfilled" | "no_active_claim";

// Only a `fulfilled` application, and only one a volunteer still holds: going
// back to `claimed` with nobody on the claim would be a child on no one's list
// and off the browse cards.
export function fulfilRevertBlocker(state: {
  status: ApplicationStatus;
  claim: { releasedAt: Date | null } | null;
}): FulfilRevertBlocker | null {
  if (state.status !== "fulfilled") {
    return "not_fulfilled";
  }
  if (!state.claim || state.claim.releasedAt !== null) {
    return "no_active_claim";
  }
  return null;
}
