import { describe, expect, it } from "vitest";

import type { Actor } from "@/lib/actor";

import {
  canEditApplication,
  canStartApplication,
  canSubmitApplication,
  canUploadApplicationFile,
  canViewApplicationFile,
  canViewSensitiveChildData,
  getSubmitBlockReason,
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

  it("lets any signed-in user start when intake is open, but nobody when it's closed", () => {
    expect(canStartApplication(parent, open)).toBe(true);
    expect(
      canStartApplication(parent, {
        ...open,
        settings: { applicationsEnabled: false },
      }),
    ).toBe(false);
    // A volunteer may also be a parent — roles are a combinable set — and the
    // `parent` role is EARNED by submitting, so it cannot be required here.
    expect(canStartApplication(volunteer, open)).toBe(true);
    expect(canStartApplication(null, open)).toBe(false);
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

// The submit gate combines four rules that each fail for a different reason, so
// it returns WHICH one blocked — a parent who can't submit deserves to know why.
describe("getSubmitBlockReason (the full submit gate)", () => {
  const own = { parentId: "p1", status: "draft" as const };
  const open = {
    campaign: { status: "active" as const, acceptingApplications: true },
    settings: { applicationsEnabled: true },
    contactable: true,
  };

  it("allows the owning parent when every gate passes", () => {
    expect(getSubmitBlockReason(parent, own, open)).toBeNull();
    expect(canSubmitApplication(parent, own, open)).toBe(true);
  });

  it("blocks a different parent", () => {
    expect(getSubmitBlockReason(otherParent, own, open)).toBe("not_owner");
  });

  it("blocks once an admin has approved it (edit lock)", () => {
    expect(
      getSubmitBlockReason(parent, { ...own, status: "approved" }, open),
    ).toBe("locked");
  });

  it("blocks when intake is closed — campaign, accepting flag, or kill switch", () => {
    expect(getSubmitBlockReason(parent, own, { ...open, campaign: null })).toBe(
      "intake_closed",
    );
    expect(
      getSubmitBlockReason(parent, own, {
        ...open,
        campaign: { status: "active", acceptingApplications: false },
      }),
    ).toBe("intake_closed");
    expect(
      getSubmitBlockReason(parent, own, {
        ...open,
        settings: { applicationsEnabled: false },
      }),
    ).toBe("intake_closed");
  });

  // Contactability is enforced HERE, never at login (Phase 4 decision).
  it("blocks when nobody could reach the family", () => {
    expect(
      getSubmitBlockReason(parent, own, { ...open, contactable: false }),
    ).toBe("no_contact");
  });

  it("lets an admin override the intake gate but never the contact gate", () => {
    expect(
      getSubmitBlockReason(admin, own, { ...open, campaign: null }),
    ).toBeNull();
    expect(
      getSubmitBlockReason(admin, own, { ...open, contactable: false }),
    ).toBe("no_contact");
  });
});

// The ВПО certificate is a state document about a child. Its rule is separate
// from the sensitive-field rule on purpose, so widening one can't widen it.
describe("canViewApplicationFile", () => {
  const app = { parentId: "p1" };
  const activeClaim = { volunteerId: "v1", releasedAt: null };

  it("never shows the ВПО certificate to a volunteer — even the claiming one", () => {
    expect(
      canViewApplicationFile(volunteer, app, activeClaim, "idp_certificate"),
    ).toBe(false);
  });

  it("shows the ВПО certificate to an admin and to the owning parent", () => {
    expect(canViewApplicationFile(admin, app, null, "idp_certificate")).toBe(
      true,
    );
    expect(canViewApplicationFile(parent, app, null, "idp_certificate")).toBe(
      true,
    );
  });

  it("shows the photos to the claiming volunteer, but not to another one", () => {
    for (const kind of ["letter_photo", "child_with_letter_photo"] as const) {
      expect(canViewApplicationFile(volunteer, app, activeClaim, kind)).toBe(
        true,
      );
      expect(
        canViewApplicationFile(
          volunteer,
          app,
          { volunteerId: "v2", releasedAt: null },
          kind,
        ),
      ).toBe(false);
      // ...nor after the claim is released.
      expect(
        canViewApplicationFile(
          volunteer,
          app,
          { volunteerId: "v1", releasedAt: new Date() },
          kind,
        ),
      ).toBe(false);
    }
  });
});

// The upload window and the edit lock disagree for exactly one kind. Approval
// freezes an application's content; the gift confirmation is uploaded long
// after that, so reusing the edit lock would make confirming receipt impossible.
describe("canUploadApplicationFile", () => {
  const owned = { parentId: "p1" };

  it("lets the parent upload the confirmation only while a volunteer holds it", () => {
    expect(
      canUploadApplicationFile(
        parent,
        { ...owned, status: "claimed" },
        "confirmation",
      ),
    ).toBe(true);
    // Nothing to confirm before a claim, and nothing to add after it is done.
    for (const status of [
      "approved",
      "submitted",
      "draft",
      "fulfilled",
    ] as const) {
      expect(
        canUploadApplicationFile(parent, { ...owned, status }, "confirmation"),
      ).toBe(false);
    }
  });

  it("never lets someone else upload a confirmation to your application", () => {
    expect(
      canUploadApplicationFile(
        otherParent,
        { ...owned, status: "claimed" },
        "confirmation",
      ),
    ).toBe(false);
  });

  // The form's own uploads keep the edit lock they always had.
  it("keeps the edit lock for the form uploads", () => {
    expect(
      canUploadApplicationFile(
        parent,
        { ...owned, status: "draft" },
        "letter_photo",
      ),
    ).toBe(true);
    expect(
      canUploadApplicationFile(
        parent,
        { ...owned, status: "approved" },
        "letter_photo",
      ),
    ).toBe(false);
  });
});

// A parent may keep changing an application until an admin reviews it. The
// submit gate has always allowed that; the SQL guard behind it did not, so
// pressing the button after an edit failed and blamed a review that had not
// happened.
describe("submitting an already-submitted application", () => {
  const ctx = {
    campaign: { status: "active" as const, acceptingApplications: true },
    settings: { applicationsEnabled: true },
    contactable: true,
  };

  it("is allowed while it is still submitted", () => {
    expect(
      getSubmitBlockReason(
        parent,
        { parentId: "p1", status: "submitted" },
        ctx,
      ),
    ).toBeNull();
  });

  it("is refused once an admin has decided it", () => {
    for (const status of [
      "approved",
      "rejected",
      "claimed",
      "fulfilled",
    ] as const) {
      expect(
        getSubmitBlockReason(parent, { parentId: "p1", status }, ctx),
      ).toBe("locked");
    }
  });
});
