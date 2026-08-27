// Authorization barrel — the audit surface.
//
// Predicates live beside the resource they govern (src/features/<resource>/authz.ts)
// because schema + validation + authz + queries change together per resource.
// This file re-exports every one of them so the security boundary stays
// greppable and reviewable in a single place (CLAUDE.md): if you want to know
// what the app can authorize, read this list.
//
// Existing call sites can keep importing from "@/lib/authz"; new feature code
// may import the feature module directly. Actor primitives live in "@/lib/actor"
// so this barrel never becomes a circular import.
//
// ⚠️ Every predicate here is server-side only. A client-side check is UX, never
// a security boundary.

export {
  type Actor,
  type AdminActor,
  type MaybeActor,
  type UserActor,
  hasRole,
  isAdmin,
  isUser,
} from "@/lib/actor";

export {
  canEditApplication,
  canModerateApplications,
  canStartApplication,
  canSubmitApplication,
  canViewSensitiveChildData,
  getSubmitBlockReason,
  ownsApplication,
  type SubmitBlockReason,
} from "@/features/applications/authz";

export { type BrowseCard, toBrowseCard } from "@/features/applications/mappers";

export { intakeOpen, type ResolvedSettings } from "@/features/campaigns/authz";

export {
  canBrowseChildren,
  canClaim,
  isClaimed,
} from "@/features/claims/authz";
