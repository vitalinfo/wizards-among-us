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
  it("writes the row as stored, detail suffix included", () => {
    const [header, line] = auditLogsToCsv(t, [row]).split("\r\n");
    expect(header).toBe(
      "created_at,actor_type,actor_id,actor_label,ip,action,target_type,target_id",
    );
    // The field list is quoted (it holds a comma) rather than split across
    // columns — it is the record of what the admin changed.
    expect(line).toBe(
      `2026-11-03T08:33:41.000Z,${labels.actorType.admin},6f1c0a52-2b7e-4c1a-9a43-0d6b2f8e9c11,admin@example.com,109.108.250.136,"application.updated_by_admin:childName,giftPrice",${labels.targetType.application},d75c6aa0-d3c3-468b-bffa-6ca82a25a1da`,
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
      "settings.intake_enabled",
      labels.targetType.settings,
      "",
    ]);
  });

  // The trail is append-only: an older build's type has no copy here, and the
  // file must still say what it is rather than blank it.
  it("writes a type without a label as its code", () => {
    const [, line] = auditLogsToCsv(t, [
      { ...row, targetType: "something_new" },
    ]).split("\r\n");
    expect(line.split(",")).toContain("something_new");
  });

  it("is a header alone when there is nothing to export", () => {
    expect(auditLogsToCsv(t, []).split("\r\n")).toHaveLength(1);
  });
});
