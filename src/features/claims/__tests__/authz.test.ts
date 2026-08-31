import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/actor";

import {
  canAssignVolunteer,
  canBrowseChildren,
  canClaim,
  canReleaseClaim,
  getClaimBlockReason,
} from "../authz";

const parent: Actor = {
  kind: "user",
  id: "p1",
  username: "p1",
  firstName: "Petro",
  roles: ["parent"],
};
const volunteer: Actor = {
  kind: "user",
  id: "v1",
  username: "v1",
  firstName: "Vira",
  roles: ["volunteer"],
};
const admin: Actor = { kind: "admin", id: "a1", email: "a@example.test" };

// Contactability describes the volunteer being assigned, not the actor.
const reachable = { contactable: true };
const unreachable = { contactable: false };

describe("canClaim", () => {
  it("a volunteer can claim an approved, unclaimed application", () => {
    expect(canClaim(volunteer, { status: "approved" }, null, reachable)).toBe(
      true,
    );
  });

  it("cannot claim a non-approved application", () => {
    expect(canClaim(volunteer, { status: "submitted" }, null, reachable)).toBe(
      false,
    );
  });

  it("cannot claim while an active claim exists, but can after release", () => {
    expect(
      canClaim(
        volunteer,
        { status: "approved" },
        { releasedAt: null },
        reachable,
      ),
    ).toBe(false);
    expect(
      canClaim(
        volunteer,
        { status: "approved" },
        { releasedAt: new Date() },
        reachable,
      ),
    ).toBe(true);
  });

  it("a parent cannot claim", () => {
    expect(canClaim(parent, { status: "approved" }, null, reachable)).toBe(
      false,
    );
  });

  // Phase 6 decision, mirroring the parent side's submit gate: a child must
  // never be held by someone the family cannot reach.
  it("a volunteer with no contact cannot claim", () => {
    expect(canClaim(volunteer, { status: "approved" }, null, unreachable)).toBe(
      false,
    );
  });

  // An admin assigning by hand must not be able to bypass the contact gate —
  // the point is the FAMILY being able to reach the volunteer, and that is
  // unaffected by who recorded the assignment.
  it("an admin cannot assign an unreachable volunteer either", () => {
    expect(canClaim(admin, { status: "approved" }, null, unreachable)).toBe(
      false,
    );
    expect(canClaim(admin, { status: "approved" }, null, reachable)).toBe(true);
  });
});

describe("getClaimBlockReason", () => {
  it("names which gate refused, so the UI can explain it", () => {
    expect(
      getClaimBlockReason(parent, { status: "approved" }, null, reachable),
    ).toBe("not_volunteer");
    expect(
      getClaimBlockReason(volunteer, { status: "draft" }, null, reachable),
    ).toBe("not_available");
    expect(
      getClaimBlockReason(
        volunteer,
        { status: "approved" },
        { releasedAt: null },
        reachable,
      ),
    ).toBe("not_available");
    expect(
      getClaimBlockReason(volunteer, { status: "approved" }, null, unreachable),
    ).toBe("no_contact");
    expect(
      getClaimBlockReason(volunteer, { status: "approved" }, null, reachable),
    ).toBeNull();
  });

  // Role is checked before availability so a parent is told the real reason
  // rather than "already taken".
  it("reports the role problem before the availability one", () => {
    expect(
      getClaimBlockReason(
        parent,
        { status: "draft" },
        { releasedAt: null },
        unreachable,
      ),
    ).toBe("not_volunteer");
  });
});

describe("canBrowseChildren", () => {
  it("is open to volunteers and admins only", () => {
    expect(canBrowseChildren(volunteer)).toBe(true);
    expect(canBrowseChildren(admin)).toBe(true);
    expect(canBrowseChildren(parent)).toBe(false);
    expect(canBrowseChildren(null)).toBe(false);
  });
});

// No self-release (Phase 6 decision): a volunteer who cannot follow through
// contacts the coordinator, so a human sees every drop-out instead of children
// quietly returning to the pool.
describe("canReleaseClaim / canAssignVolunteer", () => {
  it("are admin-only", () => {
    for (const predicate of [canReleaseClaim, canAssignVolunteer]) {
      expect(predicate(admin)).toBe(true);
      expect(predicate(volunteer)).toBe(false);
      expect(predicate(parent)).toBe(false);
      expect(predicate(null)).toBe(false);
    }
  });
});

// Manual assignment reveals the family's town, address, name and contact to
// the assigned volunteer. That is the same disclosure a self-claim makes, so it
// goes through the same predicate — an admin override must not become a way
// around the gates.
describe("admin assignment uses the same gate as a self-claim", () => {
  it("refuses an application that isn't approved", () => {
    expect(
      getClaimBlockReason(admin, { status: "rejected" }, null, reachable),
    ).toBe("not_available");
  });

  it("refuses an unreachable volunteer", () => {
    expect(
      getClaimBlockReason(admin, { status: "approved" }, null, unreachable),
    ).toBe("no_contact");
  });

  // Reassignment is the one thing an admin may do that a volunteer may not:
  // taking over an ACTIVE claim. The predicate still reports it as unavailable,
  // which is why the admin path passes `takeover` to the write layer rather
  // than bypassing this check — the DB transaction is what allows it.
  it("still reports an actively claimed application as unavailable", () => {
    expect(
      getClaimBlockReason(
        admin,
        { status: "claimed" },
        { releasedAt: null },
        reachable,
      ),
    ).toBe("not_available");
  });
});
