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
// it, so this mapping is the entire difference a signed-in person sees.
describe("accountDestination", () => {
  it("sends nobody anywhere when nobody is signed in", () => {
    expect(accountDestination(null)).toBeNull();
    expect(accountDestination(undefined)).toBeNull();
  });

  // An admin holds a session but is never a `user`, and every parent/volunteer
  // page bounces them — so they must not be offered either cabinet.
  it("sends an admin to their own panel", () => {
    expect(accountDestination(admin)).toEqual({
      href: "/admin",
      labelKey: "adminPanel",
    });
  });

  it("sends a volunteer to their wards", () => {
    expect(accountDestination(user(["volunteer"]))).toEqual({
      href: "/volunteer/claims",
      labelKey: "account",
    });
  });

  it("sends a parent to their applications", () => {
    expect(accountDestination(user(["parent"]))?.href).toBe(
      "/parent/applications",
    );
  });

  // A brand-new Telegram account has no role until it opts in, and the thing
  // it most likely came to do is file an application (Vital).
  it("sends someone with no role to the parent side", () => {
    expect(accountDestination(user([]))?.href).toBe("/parent/applications");
  });

  // The one judgement call: the volunteer cabinet only when that is the ONLY
  // thing you are, so no-role and both-roles get the same answer.
  it("sends someone who is both to the parent side", () => {
    expect(accountDestination(user(["parent", "volunteer"]))?.href).toBe(
      "/parent/applications",
    );
    expect(accountDestination(user(["volunteer", "parent"]))?.href).toBe(
      "/parent/applications",
    );
  });

  // Every destination has to be a same-origin path the header can link to —
  // an absolute URL here would be an open redirect in a very visible place.
  it("only ever returns a relative path", () => {
    for (const actor of [
      admin,
      user([]),
      user(["volunteer"]),
      user(["parent"]),
    ]) {
      const href = accountDestination(actor)?.href ?? "";
      expect(href.startsWith("/")).toBe(true);
      expect(href.startsWith("//")).toBe(false);
    }
  });
});
