import { type MaybeActor, isAdmin, isBanned, isUser } from "@/lib/actor";
import { BANNED_PATH } from "@/lib/auth/returnPath";

// Where the header's account button takes the person who is signed in.
//
// The design draws ONE round button in the header at every state — no name
// beside it — so this is the whole of what it has to decide:
//
//   admin  → /admin. An admin holds a session but is never a `user`, and the
//            account pages bounce them.
//   user   → /account, which works out which cabinet they hold. That decision
//            used to live here; it belongs to the account area, which has to
//            make it for its own sidebar anyway, and making it twice is how
//            the two would come apart.
//   banned → the page that tells them they are banned. Still signed in, so a
//            «sign in» button would only lead back to it.
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
  if (isBanned(actor)) {
    return { href: BANNED_PATH, labelKey: "account" };
  }
  if (!isUser(actor)) {
    return null;
  }
  return { href: "/account", labelKey: "account" };
}
