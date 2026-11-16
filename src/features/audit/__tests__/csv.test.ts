import { getTranslations } from "next-intl/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";

import type { AuditLogRow } from "../adminQueries";
import { auditLogsToCsv } from "../csv";

const row: AuditLogRow = {
  id: "00000000-0000-4000-8000-000000000001",
  actorId: "6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11",
  actorType: "admin",
  actorLabel: "admin@example.com",
  action: "application.updated_by_admin:childName,giftPrice",
  targetType: "application",
  targetId: "d75c6aa0-d3c3-468b-bffa-6ca82a25a1da",
  ip: "109.108.250.136",
  createdAt: new Date("2026-11-03T08:33:41Z"),
};

// The same translator the export route hands it.
const t = await getTranslations("admin.audit");
const labels = messages.admin.audit;

describe("auditLogsToCsv", () => {
  it("writes the row in words, the action's detail kept", () => {
    const [header, line] = auditLogsToCsv(t, [row]).split("\r\n");
    const c = labels.exportColumns;
    expect(header).toBe(
      [
        c.created_at,
        c.actor_type,
        c.actor_id,
        c.actor_label,
        c.ip,
        c.action,
        c.target_type,
        c.target_id,
      ].join(","),
    );
    // The field list follows the label — it is the record of what the admin
    // changed — and the cell is quoted because it holds a comma.
    expect(line).toBe(
      `2026-11-03T08:33:41.000Z,${labels.actorType.admin},6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11,admin@example.com,109.108.250.136,"${labels.actions.application.updated_by_admin}: childName,giftPrice",${labels.targetType.application},d75c6aa0-d3c3-468b-bffa-6ca82a25a1da`,
    );
  });

  it("leaves an unrecorded address and target empty", () => {
    const [, line] = auditLogsToCsv(t, [
      {
        ...row,
        ip: null,
        targetId: null,
        action: "settings.intake_enabled",
        targetType: "settings",
      },
    ]).split("\r\n");
    expect(line.split(",")).toEqual([
      "2026-11-03T08:33:41.000Z",
      labels.actorType.admin,
      row.actorId,
      "admin@example.com",
      "",
      labels.actions.settings.intake_enabled,
      labels.targetType.settings,
      "",
    ]);
  });

  // The trail is append-only: an older build's type has no copy here, and the
  // file must still say what it is rather than blank it.
  it("writes a type or an action without a label as its code", () => {
    const [, line] = auditLogsToCsv(t, [
      {
        ...row,
        targetType: "something_new",
        action: "application.teleported:idp_certificate",
      },
    ]).split("\r\n");
    expect(line.split(",")).toContain("something_new");
    expect(line.split(",")).toContain("application.teleported:idp_certificate");
  });

  it("is a header alone when there is nothing to export", () => {
    expect(auditLogsToCsv(t, []).split("\r\n")).toHaveLength(1);
  });
});
