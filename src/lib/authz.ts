import type { UserRole } from "@/db/enums";
import type { applications, campaigns, claims } from "@/db/schema";

// Types are imported with `import type` so this module stays free of any runtime
// DB/drizzle imports — the predicates are pure and safe to import anywhere.
type Application = typeof applications.$inferSelect;
type Campaign = typeof campaigns.$inferSelect;
type Claim = typeof claims.$inferSelect;

// Settings is a key-value table; callers resolve the switches they need into a
// plain object before calling the predicates (keeps authz decoupled from the
// row shape).
type ResolvedSettings = { applicationsEnabled: boolean };

// The authenticated actor. Sessions are resolved into an Actor in Phase 3
// (getSessionActor / requireAdmin); these predicates are the pure, testable
// authorization rules that every server action / route guard must call. A
// client-side check is UX only — never a security boundary (CLAUDE.md).
export type UserActor = {
  kind: "user";
  id: string;
  roles: readonly UserRole[];
};
export type AdminActor = { kind: "admin"; id: string; email: string };
export type Actor = UserActor | AdminActor;

type MaybeActor = Actor | null | undefined;

export function isAdmin(actor: MaybeActor): actor is AdminActor {
  return actor?.kind === "admin";
}
export function isUser(actor: MaybeActor): actor is UserActor {
  return actor?.kind === "user";
}
export function hasRole(actor: MaybeActor, role: UserRole): boolean {
  return isUser(actor) && actor.roles.includes(role);
}
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
  if (isAdmin(actor)) return true;
  return (
    ownsApplication(actor, application) &&
    PARENT_EDITABLE.includes(application.status)
  );
}

// Intake gate for STARTING a new application: an active campaign AND it's
// accepting AND the global kill switch is on (§6).
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
export function canStartApplication(
  actor: MaybeActor,
  ctx: Parameters<typeof intakeOpen>[0],
): boolean {
  if (isAdmin(actor)) return true; // operational override
  return hasRole(actor, "parent") && intakeOpen(ctx);
}

export function canBrowseChildren(actor: MaybeActor): boolean {
  return isAdmin(actor) || hasRole(actor, "volunteer");
}

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
  if (!isAdmin(actor) && !hasRole(actor, "volunteer")) return false;
  return application.status === "approved" && !isClaimed(activeClaim);
}

// Sensitive child data — current_town, delivery_information, parent_name, and
// the family's Telegram — is visible only to an admin, the owning parent, or the
// volunteer holding the ACTIVE claim (guardrail).
export function canViewSensitiveChildData(
  actor: MaybeActor,
  application: Pick<Application, "parentId">,
  claim: Pick<Claim, "volunteerId" | "releasedAt"> | null | undefined,
): boolean {
  if (isAdmin(actor)) return true;
  if (ownsApplication(actor, application)) return true;
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

// Browse-card projection: the ONLY child fields a volunteer may see before
// claiming (guardrail). Sensitive fields are dropped here at the data layer, so
// a redacted card physically cannot carry delivery/contact info to the client.
export type BrowseCard = {
  id: Application["id"];
  childFirstName: string | null;
  childAge: Application["childAge"];
  currentRegion: Application["currentRegion"];
  giftDescription: Application["giftDescription"];
  giftPrice: Application["giftPrice"];
  status: Application["status"];
};
export function toBrowseCard(application: Application): BrowseCard {
  return {
    id: application.id,
    childFirstName: firstName(application.childName),
    childAge: application.childAge,
    currentRegion: application.currentRegion,
    giftDescription: application.giftDescription,
    giftPrice: application.giftPrice,
    status: application.status,
  };
}
function firstName(fullName: string | null): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first : null;
}
