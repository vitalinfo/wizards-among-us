import { describe, expect, it } from "vitest";

import type { UserRole } from "@/db/enums";
import { accountDestination } from "@/features/users/account";
import type { AdminActor, UserActor } from "@/lib/actor";

const user = (roles: readonly UserRole[]): UserActor => ({
  kind: "user",
  id: "u1",
  username: "olena",
  firstName: "Олена",
  roles,
});

const admin: AdminActor = {
  kind: "admin",
  id: "a1",
  email: "admin@example.com",
};

// Where the header's one round button goes. There is no visible label beside
// it, so this mapping is the entire difference a signed-in person sees — and
// it is now just two answers, because /account works out which cabinet they
// hold. That decision belongs to the account area, which has to make it for
// its own sidebar anyway.
describe("accountDestination", () => {
  it("sends nobody anywhere when nobody is signed in", () => {
    expect(accountDestination(null)).toBeNull();
    expect(accountDestination(undefined)).toBeNull();
  });

  // An admin holds a session but is never a `user`, and every account page
  // bounces them — so they must not be offered a cabinet.
  it("sends an admin to their own panel", () => {
    expect(accountDestination(admin)).toEqual({
      href: "/admin",
      labelKey: "adminPanel",
    });
  });

  // Every role, and no role, resolves to the same door. /account decides what
  // is behind it; a second copy of that rule here is how the sidebar and the
  // header would start disagreeing.
  it.each([
    ["no role", user([])],
    ["parent", user(["parent"])],
    ["volunteer", user(["volunteer"])],
    ["both", user(["parent", "volunteer"])],
  ])("sends a signed-in %s to /account", (_name, actor) => {
    expect(accountDestination(actor)).toEqual({
      href: "/account",
      labelKey: "account",
    });
  });

  // Every destination has to be a same-origin path the header can link to —
  // an absolute URL here would be an open redirect in a very visible place.
  it("only ever returns a relative path", () => {
    for (const actor of [admin, user([]), user(["volunteer"])]) {
      const href = accountDestination(actor)?.href ?? "";
      expect(href.startsWith("/")).toBe(true);
      expect(href.startsWith("//")).toBe(false);
    }
  });
});
