import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, identities } from "@/db/schema";
import { recordAuditLog } from "@/features/audit/log";
import type { Actor } from "@/lib/actor";
import { siteOrigin } from "@/lib/site";
import { sendTelegramMessage } from "@/lib/telegramBot";

type Decision = "approved" | "rejected";

// The translator for `notifications.telegram`, narrowed to what this file uses
// so the message builder stays pure and testable without a request scope.
export type DecisionTranslator = (
  key: Decision,
  values: { childName: string; url: string },
) => string;

// The message is a pointer, not a copy of the decision. It names the child (a
// parent may have filed several) and links to the application — and nothing
// else. In particular the rejection note is NOT sent: it is free text an admin
// wrote about a family, and a Telegram message lives on Telegram's servers and
// on a lock screen. The parent reads the note in the app, behind sign-in.
export function decisionMessage(
  t: DecisionTranslator,
  decision: Decision,
  applicationId: string,
  childName: string,
): string {
  // The host THIS deploy serves — staging's bot sends a staging link.
  const url = `${siteOrigin()}/account/parent/applications/${applicationId}/view`;
  return t(decision, { childName, url });
}

// The parent's Telegram id (= the chat id) and the child's first name.
async function getDecisionRecipient(
  applicationId: string,
): Promise<{ chatId: string; childName: string } | null> {
  const [row] = await getDb()
    .select({
      chatId: identities.providerUserId,
      childName: applications.childName,
    })
    .from(applications)
    .innerJoin(
      identities,
      and(
        eq(identities.userId, applications.parentId),
        eq(identities.provider, "telegram"),
      ),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);
  return row ? { chatId: row.chatId, childName: row.childName ?? "" } : null;
}

// Tell the parent their application was decided. Best effort by design: it runs
// after the decision is committed, and a parent who never allowed the bot (or
// blocked it) still sees the status in «Мої заявки». Never throws.
//
// Audit-logged under the deciding admin — the trail answers "was this family
// told, and when", and a failure is as worth knowing as a success.
export async function notifyParentOfDecision({
  admin,
  applicationId,
  decision,
  t,
}: {
  admin: Actor;
  applicationId: string;
  decision: Decision;
  t: DecisionTranslator;
}): Promise<void> {
  try {
    const recipient = await getDecisionRecipient(applicationId);
    if (!recipient) {
      return;
    }

    const result = await sendTelegramMessage(
      recipient.chatId,
      decisionMessage(t, decision, applicationId, recipient.childName),
    );
    if (!result.ok && result.reason === "not_configured") {
      return;
    }
    if (!result.ok) {
      console.warn("Decision notification not delivered:", {
        applicationId,
        reason: result.reason,
        status: result.status,
      });
    }

    await recordAuditLog({
      actor: admin,
      action: result.ok
        ? "application.parent_notified"
        : `application.parent_notify_failed:${result.reason}`,
      targetType: "application",
      targetId: applicationId,
    });
  } catch (error) {
    console.error("notifyParentOfDecision failed:", { applicationId, error });
  }
}
