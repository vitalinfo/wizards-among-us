import { getTranslations } from "next-intl/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";

import { auditActionLabel, groupAuditActions } from "../actionLabel";

// The same translator the page and the form hand it.
const t = await getTranslations("admin.audit");

describe("auditActionLabel", () => {
  it("names a known action", () => {
    expect(auditActionLabel(t, "application.approved")).toBe(
      messages.admin.audit.actions.application.approved,
    );
  });

  // The trail outlives the code that wrote it: a code with no copy must still
  // read, as itself.
  it("falls back to the code for an action without a label", () => {
    expect(auditActionLabel(t, "application.teleported")).toBe(
      "application.teleported",
    );
  });

  // A url can put anything in the select; a bare namespace must not resolve
  // to an object, and junk must not reach the translator.
  it("does not look up anything but an entity.verb code", () => {
    for (const value of ["application", "actions.application", "x y"]) {
      expect(auditActionLabel(t, value)).toBe(value);
    }
  });
});

describe("groupAuditActions", () => {
  const a = messages.admin.audit;

  it("groups by entity in the order of the actions tree, labels sorted inside", () => {
    const groups = groupAuditActions(t, [
      "user.note_saved",
      "campaign.created",
      "application.approved",
      "application.rejected",
    ]);

    expect(groups.map((group) => group.label)).toEqual([
      a.actionGroups.application,
      a.actionGroups.campaign,
      a.actionGroups.user,
    ]);
    // «…відхилено» before «…схвалено»: by label, not by code.
    expect(groups[0].options).toEqual([
      { action: "application.rejected", label: a.actions.application.rejected },
      { action: "application.approved", label: a.actions.application.approved },
    ]);
  });

  // An older build's entity still has to be findable — after the known ones,
  // named by its code.
  it("puts an entity the tree doesn't know last, under its code", () => {
    const groups = groupAuditActions(t, ["teleport.used", "faq.created"]);

    expect(groups.map((group) => group.label)).toEqual([
      a.actionGroups.faq,
      "teleport",
    ]);
    expect(groups[1].options).toEqual([
      { action: "teleport.used", label: "teleport.used" },
    ]);
  });
});
