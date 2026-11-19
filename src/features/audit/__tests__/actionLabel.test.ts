import { getTranslations } from "next-intl/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", async () =>
  (await import("@/test/serverIntl")).serverIntl(),
);

import messages from "../../../../messages/uk.json";

import {
  auditActionLabel,
  auditDetailLabel,
  auditTypeLabel,
  groupAuditActions,
} from "../actionLabel";
import type { TelegramSendResult } from "@/lib/telegramBot";
import {
  noticeSentAction,
  type Notice,
} from "@/features/notifications/telegram";

// The same translator the page and the form hand it.
const t = await getTranslations("admin.audit");

describe("auditActionLabel", () => {
  it("names a known action", () => {
    expect(auditActionLabel(t, "application.approved")).toBe(
      messages.admin.audit.actions.application.approved,
    );
  });

  // No code path writes these two: they record admin fixes made by hand in SQL
  // (undoing a mistaken «отримали», removing the review left behind by it).
  // `fulfil_reverted` is also an analytics state event.
  it("names the actions only written by hand", () => {
    expect(auditActionLabel(t, "application.fulfil_reverted")).toBe(
      messages.admin.audit.actions.application.fulfil_reverted,
    );
    expect(auditActionLabel(t, "review.deleted")).toBe(
      messages.admin.audit.actions.review.deleted,
    );
  });

  // Every bot notice, delivered or failed (`deliverNotice`). The record makes a
  // new Notice a type error here until it has copy.
  it("names every notification, sent and failed", () => {
    const notices = Object.keys({
      approved: true,
      rejected: true,
      claimed: true,
      fulfilled: true,
    } satisfies Record<Notice, true>) as Notice[];

    for (const notice of notices) {
      const sent = noticeSentAction(notice);
      for (const action of [sent, `${sent}_failed`]) {
        expect(auditActionLabel(t, action)).not.toBe(action);
      }
    }
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

describe("auditDetailLabel", () => {
  // Every reason deliverNotice can log. `not_configured` is never logged —
  // nothing was attempted. The record makes a new reason a type error here
  // until it has copy.
  it("names every reason a notification can fail", () => {
    type LoggedReason = Exclude<
      Extract<TelegramSendResult, { ok: false }>["reason"],
      "not_configured"
    >;
    const reasons = Object.keys({
      blocked: true,
      error: true,
    } satisfies Record<LoggedReason, true>) as LoggedReason[];

    for (const reason of reasons) {
      expect(auditDetailLabel(t, "notification.approved_failed", reason)).toBe(
        messages.admin.audit.actionDetails.notification[reason],
      );
    }
  });

  // Most details are data with no copy — a file kind, edited field names.
  it("falls back to the detail as stored", () => {
    expect(
      auditDetailLabel(
        t,
        "application.updated_by_admin",
        "childName,giftPrice",
      ),
    ).toBe("childName,giftPrice");
    expect(
      auditDetailLabel(t, "application.file_viewed", "idp_certificate"),
    ).toBe("idp_certificate");
  });

  // A detail must not resolve to a namespace or reach the translator as junk.
  it("does not look up anything but a plain code", () => {
    expect(auditDetailLabel(t, "notification", "blocked")).toBe("blocked");
    expect(
      auditDetailLabel(t, "notification.approved_failed", "blocked.x"),
    ).toBe("blocked.x");
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

describe("auditTypeLabel", () => {
  it("names a known actor and target type", () => {
    expect(auditTypeLabel(t, "actorType", "admin")).toBe(
      messages.admin.audit.actorType.admin,
    );
    expect(auditTypeLabel(t, "targetType", "campaign")).toBe(
      messages.admin.audit.targetType.campaign,
    );
  });

  // Same fallback as an action: an older build's type still reads, and a
  // malformed one never reaches a lookup that would name a whole namespace.
  it("falls back to the code", () => {
    expect(auditTypeLabel(t, "targetType", "something_new")).toBe(
      "something_new",
    );
    expect(auditTypeLabel(t, "targetType", "a.b")).toBe("a.b");
  });
});
