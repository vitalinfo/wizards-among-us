import type { UserRole } from "@/db/enums";
import type { Actor } from "@/lib/actor";

import { manifestoHrefs } from "../manifestoHrefs";

const user = (...roles: UserRole[]): Actor => ({
  kind: "user",
  id: "11111111-1111-4111-8111-111111111111",
  username: "olya",
  firstName: "Оля",
  roles,
});

const admin: Actor = {
  kind: "admin",
  id: "22222222-2222-4222-8222-222222222222",
  email: "admin@example.com",
};

describe("manifestoHrefs", () => {
  // A visitor who has read the whole page should not have to read it again:
  // the button goes to the cabinet, and sign-in is the step on the way.
  it("sends a signed-in user straight into the cabinet", () => {
    expect(manifestoHrefs(user("parent"))).toEqual({
      families: "/account/parent/applications",
      volunteers: "/account/volunteer/children",
    });
  });

  // The volunteer role is self-serve and the browse page forwards someone
  // without it to the opt-in, so the destination does not depend on the role.
  it("does not branch on which role the user holds", () => {
    expect(manifestoHrefs(user("volunteer"))).toEqual(
      manifestoHrefs(user("parent")),
    );
  });

  it("routes an anonymous visitor through /login, carrying the destination", () => {
    expect(manifestoHrefs(null)).toEqual({
      families: "/login?next=%2Faccount%2Fparent%2Fapplications",
      volunteers: "/login?next=%2Faccount%2Fvolunteer%2Fchildren",
    });
  });

  // An admin holds a session but is not a user, and must not be dropped into
  // a cabinet page that would bounce them. /login is the page that explains
  // what signing in here would cost them.
  it("treats an admin as signed out", () => {
    expect(manifestoHrefs(admin)).toEqual(manifestoHrefs(null));
  });
});
