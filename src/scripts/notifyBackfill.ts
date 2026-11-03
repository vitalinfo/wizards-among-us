import { loadEnvConfig } from "@next/env";
import { and, asc, eq, inArray, like } from "drizzle-orm";
import { createTranslator } from "next-intl";

import { getDb } from "@/db";
import { admins, applications, auditLogs } from "@/db/schema";
import {
  backfillNotice,
  deliverNotice,
  getNoticeRecipient,
  noticeSentAction,
  type NoticeTranslator,
} from "@/features/notifications/telegram";
import { siteOrigin } from "@/lib/site";

import messages from "../../messages/uk.json";

// One-off backfill: send the Telegram notice an application is owed for what
// happened to it before notices existed.
//
//   pnpm notify:backfill                          dry run — reads, sends
//                                                 nothing, prints who would
//                                                 get which message
//   pnpm notify:backfill --send --admin <email>   sends them
//
// Each application gets ONE notice, for its current status (backfillNotice):
//   approved / rejected   → the parent, the decision
//   claimed / processed   → the parent, "a volunteer was found"
//   fulfilled             → the volunteer holding the claim, "receipt confirmed"
// Not the whole history: a family whose child is claimed already knows more
// than a late "approved" would tell them.
//
// Each send is audit-logged exactly as a live one is, but under the admin named
// by --admin (the person running this is who decided these messages go out
// now). An application that already has a successful send of its notice in the
// audit log is skipped, so a re-run — after a failure, or by accident — never
// messages anyone twice; failed ones are retried.
//
// Run against another environment the way photos:normalize is (README,
// "Uploaded photos"), passing that app's DATABASE_URL, TELEGRAM_BOT_TOKEN and
// CANONICAL_HOST — the last one is the host the links point at. It prints all
// three (never a secret) before doing anything.
loadEnvConfig(process.cwd());

// Telegram allows ~30 messages a second per bot; stay well under it.
const PAUSE_MS = 100;

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const adminFlag = args.indexOf("--admin");
  const adminEmail = adminFlag === -1 ? undefined : args[adminFlag + 1];
  printTarget();

  const decided = await getDb()
    .select({ id: applications.id, status: applications.status })
    .from(applications)
    .where(
      inArray(applications.status, [
        "approved",
        "rejected",
        "claimed",
        "processed",
        "fulfilled",
      ]),
    )
    .orderBy(asc(applications.submittedAt), asc(applications.id));

  const alreadySent = new Set(
    (
      await getDb()
        .select({ targetId: auditLogs.targetId, action: auditLogs.action })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.targetType, "application"),
            like(auditLogs.action, "notification.%"),
          ),
        )
    ).map((row) => `${row.targetId}:${row.action}`),
  );

  const pending = [];
  for (const row of decided) {
    const notice = backfillNotice(row.status);
    if (!notice || alreadySent.has(`${row.id}:${noticeSentAction(notice)}`)) {
      continue;
    }
    pending.push({
      id: row.id,
      notice,
      recipient: await getNoticeRecipient(row.id, notice),
    });
  }

  console.log(
    `${send ? "SENDING" : "DRY RUN — nothing will be sent"}: ${pending.length} applications owed a notice\n`,
  );
  for (const row of pending) {
    console.log(
      `${row.id.slice(0, 8)} ${row.notice.padEnd(9)} ${row.recipient ? "" : "(no Telegram identity — will be skipped)"}`,
    );
  }
  if (!send || pending.length === 0) {
    return;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set — nothing was sent.");
  }
  if (!adminEmail || adminEmail.startsWith("--")) {
    throw new Error("--send needs --admin <email>, the admin it is logged as.");
  }
  const [admin] = await getDb()
    .select({ id: admins.id, email: admins.email })
    .from(admins)
    .where(eq(admins.email, adminEmail))
    .limit(1);
  if (!admin) {
    throw new Error(`No admin with email ${adminEmail} — nothing was sent.`);
  }

  const translator = createTranslator({
    locale: "uk",
    messages,
    namespace: "notifications.telegram",
  });
  const t: NoticeTranslator = (key, values) => translator(key, values);

  const tally = { sent: 0, blocked: 0, error: 0, skipped: 0 };
  console.log("");
  for (const row of pending) {
    if (!row.recipient) {
      tally.skipped += 1;
      continue;
    }
    const result = await deliverNotice({
      actor: { kind: "admin", ...admin },
      applicationId: row.id,
      notice: row.notice,
      recipient: row.recipient,
      t,
    });
    const outcome = result.ok ? "sent" : result.reason;
    if (outcome === "not_configured") {
      throw new Error("TELEGRAM_BOT_TOKEN disappeared mid-run.");
    }
    tally[outcome] += 1;
    console.log(`${row.id.slice(0, 8)} ${row.notice.padEnd(9)} ${outcome}`);
    await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
  }

  console.log(
    `\nSent ${tally.sent}. Blocked the bot (or never allowed it): ${tally.blocked}. Errors: ${tally.error}. No Telegram identity: ${tally.skipped}.`,
  );
}

// Where this run is about to send from and link to — hosts and the bot's
// public username only, never a credential.
function printTarget() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : "(DATABASE_URL not set)";
  const bot = process.env.TELEGRAM_BOT_TOKEN
    ? `@${process.env.TELEGRAM_BOT_USERNAME ?? "(TELEGRAM_BOT_USERNAME not set)"}`
    : "(TELEGRAM_BOT_TOKEN not set)";
  console.log(
    `database: ${database}\nbot:      ${bot}\nlinks to: ${siteOrigin()}${process.env.CANONICAL_HOST ? "" : "  (CANONICAL_HOST not set — production's URL)"}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
