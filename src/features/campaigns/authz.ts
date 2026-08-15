import type { campaigns } from "@/db/schema";

type Campaign = typeof campaigns.$inferSelect;

// Settings is a key-value table; callers resolve the switches they need into a
// plain object before calling the predicates (keeps authz decoupled from the
// row shape).
export type ResolvedSettings = { applicationsEnabled: boolean };

// Intake gate: an active campaign AND it's accepting AND the global kill switch
// is on (§6). Lives with campaigns because it's about campaign state; the
// per-actor gate (canStartApplication) lives with applications.
export function intakeOpen(ctx: {
  campaign:
    Pick<Campaign, "status" | "acceptingApplications"> | null | undefined;
  settings: ResolvedSettings | null | undefined;
}): boolean {
  const { campaign, settings } = ctx;
  return (
    !!campaign &&
    campaign.status === "active" &&
    campaign.acceptingApplications &&
    !!settings &&
    settings.applicationsEnabled
  );
}
