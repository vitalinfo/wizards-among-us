import { type MaybeActor, hasRole, isAdmin, isUser } from "@/lib/actor";

// Where the header's account button takes the person who is signed in.
//
// The design draws ONE round button in the header at every state — no name
// beside it — so this is the whole of what it has to decide: which of the three
// places a signed-in person belongs to.
//
//   admin           → /admin. An admin holds a session but is never a `user`,
//                     and the parent/volunteer pages bounce them.
//   volunteer only  → their wards.
//   anything else   → the parent side, which is also where someone with NO role
//                     lands (Vital). A brand-new Telegram account has no role
//                     until it opts in, and the thing it most likely came to do
//                     is file an application.
//
// Someone with BOTH roles goes to the parent side. That is the one judgement
// call here: the rule is "the volunteer cabinet only when that is the only
// thing you are", so the no-role and both-roles cases get the same answer and
// there is only one rule to remember. The design's own account shell lists
// both cabinets in one sidebar, so once that page exists this collapses to a
// single destination and the question goes away.
export type AccountDestination = {
  href: string;
  // A key under `common` — the button has no visible text, so this is its
  // accessible name.
  labelKey: "adminPanel" | "account";
};

export function accountDestination(
  actor: MaybeActor,
): AccountDestination | null {
  if (isAdmin(actor)) {
    return { href: "/admin", labelKey: "adminPanel" };
  }
  if (!isUser(actor)) {
    return null;
  }
  if (hasRole(actor, "volunteer") && !hasRole(actor, "parent")) {
    return { href: "/volunteer/claims", labelKey: "account" };
  }
  return { href: "/parent/applications", labelKey: "account" };
}
