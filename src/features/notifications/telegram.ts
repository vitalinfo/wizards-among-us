import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, claims, identities } from "@/db/schema";
import { recordAuditLog } from "@/features/audit/log";
import type { ApplicationStatus } from "@/db/enums";
import type { Actor } from "@/lib/actor";
import { siteOrigin } from "@/lib/site";
import {
  sendTelegramMessage,
  type TelegramSendResult,
} from "@/lib/telegramBot";

// The moments an application's family or volunteer hears from the bot.
export type Notice = "approved" | "rejected" | "claimed" | "fulfilled";

// Who each notice goes to, and the page it links to.
//   approved / rejected — the parent, to the application (where the rejection
//                         note is shown).
//   claimed             — the parent, to «Мої Чарівники», which has the
//                         volunteer's contact.
//   fulfilled           — the volunteer holding the claim, to their claims.
const NOTICES: Record<
  Notice,
  { audience: "parent" | "volunteer"; path: (applicationId: string) => string }
> = {
  approved: {
    audience: "parent",
    path: (id) => `/account/parent/applications/${id}/view`,
  },
  rejected: {
    audience: "parent",
    path: (id) => `/account/parent/applications/${id}/view`,
  },
  claimed: { audience: "parent", path: () => "/account/parent/my-volunteer" },
  fulfilled: { audience: "volunteer", path: () => "/account/volunteer/claims" },
};

// The translator for `notifications.telegram`, narrowed to what this file uses
// so the message builder stays pure and testable without a request scope.
export type NoticeTranslator = (
  key: Notice,
  values: { childName: string; url: string },
) => string;

// A message is a pointer, not a copy of anything. It names the child (a parent
// may have filed several, a volunteer may hold several) and links to the page
// with the rest — nothing else. A Telegram message lives on Telegram's servers
// and on a lock screen, so what it says must be safe there: no rejection note
// (free text an admin wrote about a family), no contact, no address. Those stay
// behind sign-in.
export function noticeMessage(
  t: NoticeTranslator,
  notice: Notice,
  applicationId: string,
  childName: string,
): string {
  // The host THIS deploy serves — staging's bot sends a staging link.
  const url = `${siteOrigin()}${NOTICES[notice].path(applicationId)}`;
  return t(notice, { childName, url });
}

// The one notice an application in this status is owed, for the backfill: the
// LATEST thing that happened to it. A family whose child is already claimed
// learns nothing from a late "approved", so it gets "claimed" alone.
// `processed` is a volunteer's own mark on a child they still hold, so its
// family's news is still the claim. Drafts and submissions are owed nothing.
export function backfillNotice(status: ApplicationStatus): Notice | null {
  switch (status) {
    case "approved":
    case "rejected":
    case "claimed":
    case "fulfilled":
      return status;
    case "processed":
      return "claimed";
    default:
      return null;
  }
}

// The audit action a delivered notice is logged as. The backfill script skips
// applications that already have one, so a re-run never sends twice.
export const noticeSentAction = (notice: Notice) => `notification.${notice}`;

export type NoticeRecipient = { chatId: string; childName: string };

// The recipient's Telegram id (= the chat id) and the child's first name. The
// volunteer is whoever holds the ACTIVE claim — a released one is history.
export async function getNoticeRecipient(
  applicationId: string,
  notice: Notice,
): Promise<NoticeRecipient | null> {
  const { audience } = NOTICES[notice];
  const db = getDb();
  const rows =
    audience === "parent"
      ? await db
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
          .limit(1)
      : await db
          .select({
            chatId: identities.providerUserId,
            childName: applications.childName,
          })
          .from(applications)
          .innerJoin(
            claims,
            and(
              eq(claims.applicationId, applications.id),
              isNull(claims.releasedAt),
            ),
          )
          .innerJoin(
            identities,
            and(
              eq(identities.userId, claims.volunteerId),
              eq(identities.provider, "telegram"),
            ),
          )
          .where(eq(applications.id, applicationId))
          .limit(1);
  const [row] = rows;
  return row ? { chatId: row.chatId, childName: row.childName ?? "" } : null;
}

// Send one notice and log the attempt under `actor` — whoever caused it (the
// deciding admin, the claiming volunteer, the confirming parent). The trail
// answers "was this person told, and when", and a failure is as worth knowing
// as a success. Nothing is logged when the environment has no bot token,
// because nothing was attempted.
export async function deliverNotice({
  actor,
  applicationId,
  notice,
  recipient,
  t,
}: {
  actor: Actor;
  applicationId: string;
  notice: Notice;
  recipient: NoticeRecipient;
  t: NoticeTranslator;
}): Promise<TelegramSendResult> {
  const result = await sendTelegramMessage(
    recipient.chatId,
    noticeMessage(t, notice, applicationId, recipient.childName),
  );
  if (!result.ok && result.reason === "not_configured") {
    return result;
  }
  await recordAuditLog({
    actor,
    action: result.ok
      ? noticeSentAction(notice)
      : `${noticeSentAction(notice)}_failed:${result.reason}`,
    targetType: "application",
    targetId: applicationId,
  });
  return result;
}

// Tell the right person what just happened. Best effort by design: it runs
// after the change is committed, and someone who never allowed the bot (or
// blocked it) still sees it in the app. Never throws.
export async function notify({
  actor,
  applicationId,
  notice,
  t,
}: {
  actor: Actor;
  applicationId: string;
  notice: Notice;
  t: NoticeTranslator;
}): Promise<void> {
  try {
    const recipient = await getNoticeRecipient(applicationId, notice);
    if (!recipient) {
      return;
    }

    const result = await deliverNotice({
      actor,
      applicationId,
      notice,
      recipient,
      t,
    });
    if (!result.ok && result.reason !== "not_configured") {
      console.warn("Telegram notice not delivered:", {
        applicationId,
        notice,
        reason: result.reason,
        status: result.status,
      });
    }
  } catch (error) {
    console.error("notify failed:", { applicationId, notice, error });
  }
}
