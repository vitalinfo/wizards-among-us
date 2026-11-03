import { getTranslations } from "next-intl/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";

import { auditActionLabel } from "../actionLabel";

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
