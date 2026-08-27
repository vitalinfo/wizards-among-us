import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/actor";

import {
  canEditApplication,
  canStartApplication,
  canViewSensitiveChildData,
} from "../authz";
import { intakeOpen } from "@/features/campaigns/authz";

const admin: Actor = { kind: "admin", id: "a1", email: "a@example.com" };
const parent: Actor = {
  kind: "user",
  id: "p1",
  username: "p1",
  firstName: "Petro",
  roles: ["parent"],
};
const otherParent: Actor = {
  kind: "user",
  id: "p2",
  username: "p2",
  firstName: "Pavlo",
  roles: ["parent"],
};
const volunteer: Actor = {
  kind: "user",
  id: "v1",
  username: "v1",
  firstName: "Vira",
  roles: ["volunteer"],
};

describe("canEditApplication (edit lock)", () => {
  const own = { parentId: "p1" };

  it("parent can edit their own draft/submitted application", () => {
    expect(canEditApplication(parent, { ...own, status: "draft" })).toBe(true);
    expect(canEditApplication(parent, { ...own, status: "submitted" })).toBe(
      true,
    );
  });

  it("locks the application for the parent once approved (and after)", () => {
    for (const status of [
      "approved",
      "rejected",
      "claimed",
      "fulfilled",
    ] as const) {
      expect(canEditApplication(parent, { ...own, status })).toBe(false);
    }
  });

  it("denies a different parent and any volunteer", () => {
    expect(canEditApplication(otherParent, { ...own, status: "draft" })).toBe(
      false,
    );
    expect(canEditApplication(volunteer, { ...own, status: "draft" })).toBe(
      false,
    );
  });

  it("lets an admin edit even a locked application, but not an anonymous user", () => {
    expect(canEditApplication(admin, { ...own, status: "approved" })).toBe(
      true,
    );
    expect(canEditApplication(null, { ...own, status: "draft" })).toBe(false);
  });
});

describe("intakeOpen / canStartApplication", () => {
  const open = {
    campaign: { status: "active" as const, acceptingApplications: true },
    settings: { applicationsEnabled: true },
  };

  it("is open only when active AND accepting AND kill switch on", () => {
    expect(intakeOpen(open)).toBe(true);
    expect(
      intakeOpen({
        ...open,
        campaign: { status: "draft", acceptingApplications: true },
      }),
    ).toBe(false);
    expect(
      intakeOpen({
        ...open,
        campaign: { status: "active", acceptingApplications: false },
      }),
    ).toBe(false);
    expect(
      intakeOpen({ ...open, settings: { applicationsEnabled: false } }),
    ).toBe(false);
    expect(
      intakeOpen({ campaign: null, settings: { applicationsEnabled: true } }),
    ).toBe(false);
  });

  it("lets a parent start only when intake is open; never a volunteer", () => {
    expect(canStartApplication(parent, open)).toBe(true);
    expect(
      canStartApplication(parent, {
        ...open,
        settings: { applicationsEnabled: false },
      }),
    ).toBe(false);
    expect(canStartApplication(volunteer, open)).toBe(false);
  });

  it("lets an admin start regardless of the intake gate (override)", () => {
    expect(
      canStartApplication(admin, {
        ...open,
        settings: { applicationsEnabled: false },
      }),
    ).toBe(true);
  });
});

describe("canViewSensitiveChildData", () => {
  const app = { parentId: "p1" };

  it("admin and the owning parent can view", () => {
    expect(canViewSensitiveChildData(admin, app, null)).toBe(true);
    expect(canViewSensitiveChildData(parent, app, null)).toBe(true);
  });

  it("only the volunteer holding the active claim can view", () => {
    expect(
      canViewSensitiveChildData(volunteer, app, {
        volunteerId: "v1",
        releasedAt: null,
      }),
    ).toBe(true);
    expect(
      canViewSensitiveChildData(volunteer, app, {
        volunteerId: "v2",
        releasedAt: null,
      }),
    ).toBe(false);
    expect(
      canViewSensitiveChildData(volunteer, app, {
        volunteerId: "v1",
        releasedAt: new Date(),
      }),
    ).toBe(false);
    expect(canViewSensitiveChildData(volunteer, app, null)).toBe(false);
  });
});
