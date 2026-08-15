import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/actor";

import { canClaim } from "../authz";

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

describe("canClaim", () => {
  it("a volunteer can claim an approved, unclaimed application", () => {
    expect(canClaim(volunteer, { status: "approved" }, null)).toBe(true);
  });

  it("cannot claim a non-approved application", () => {
    expect(canClaim(volunteer, { status: "submitted" }, null)).toBe(false);
  });

  it("cannot claim while an active claim exists, but can after release", () => {
    expect(
      canClaim(volunteer, { status: "approved" }, { releasedAt: null }),
    ).toBe(false);
    expect(
      canClaim(volunteer, { status: "approved" }, { releasedAt: new Date() }),
    ).toBe(true);
  });

  it("a parent cannot claim", () => {
    expect(canClaim(parent, { status: "approved" }, null)).toBe(false);
  });
});
