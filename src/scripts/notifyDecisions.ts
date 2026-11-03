import { loadEnvConfig } from "@next/env";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { createTranslator } from "next-intl";

import { getDb } from "@/db";
import { admins, applications, auditLogs, identities } from "@/db/schema";
import {
  deliverDecisionNotification,
  PARENT_NOTIFIED_ACTION,
  type DecisionTranslator,
} from "@/features/notifications/decision";
import { siteOrigin } from "@/lib/site";

import messages from "../../messages/uk.json";

// One-off backfill: send the Telegram decision message to the parents of
// applications that were approved or rejected before decisions sent one.
//
//   pnpm notify:decisions                          dry run — reads, sends
//                                                  nothing, prints who would
//                                                  get a message
//   pnpm notify:decisions --send --admin <email>   sends them
//
// Each send is audit-logged exactly as a live decision's is, under the admin
// named by --admin (the person running this is who decided these families get
// a message now). An application that already has a successful send in the
// audit log is skipped, so a re-run — after a failure, or by accident — never
// messages a family twice; failed ones are retried.
//
// Only CURRENT status counts: an application that was approved and has since
// been claimed or fulfilled is not "approved" any more, and the family already
// knows more than this message would tell them.
//
// Run against another environment the way photos:normalize is (README,
// "Uploaded photos"), passing that app's DATABASE_URL, TELEGRAM_BOT_TOKEN and
// CANONICAL_HOST — the last one is the host the link points at. It prints all
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

  const pending = await getDb()
    .select({
      id: applications.id,
      status: applications.status,
      childName: applications.childName,
      chatId: identities.providerUserId,
    })
    .from(applications)
    .leftJoin(
      identities,
      and(
        eq(identities.userId, applications.parentId),
        eq(identities.provider, "telegram"),
      ),
    )
    .where(
      and(
        inArray(applications.status, ["approved", "rejected"]),
        sql`not exists (
          select 1 from ${auditLogs}
          where ${auditLogs.targetId} = ${applications.id}
            and ${auditLogs.action} = ${PARENT_NOTIFIED_ACTION}
        )`,
      ),
    )
    .orderBy(asc(applications.submittedAt), asc(applications.id));

  console.log(
    `${send ? "SENDING" : "DRY RUN — nothing will be sent"}: ${pending.length} decided applications whose parent hasn't been notified\n`,
  );
  for (const row of pending) {
    console.log(
      `${row.id.slice(0, 8)} ${row.status.padEnd(8)} ${row.chatId ? "" : "(no Telegram identity — will be skipped)"}`,
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
  const t: DecisionTranslator = (key, values) => translator(key, values);

  const tally = { sent: 0, blocked: 0, error: 0, skipped: 0 };
  console.log("");
  for (const row of pending) {
    if (
      !row.chatId ||
      (row.status !== "approved" && row.status !== "rejected")
    ) {
      tally.skipped += 1;
      continue;
    }
    const result = await deliverDecisionNotification({
      admin: { kind: "admin", ...admin },
      applicationId: row.id,
      decision: row.status,
      recipient: { chatId: row.chatId, childName: row.childName ?? "" },
      t,
    });
    const outcome = result.ok ? "sent" : result.reason;
    if (outcome === "not_configured") {
      throw new Error("TELEGRAM_BOT_TOKEN disappeared mid-run.");
    }
    tally[outcome] += 1;
    console.log(`${row.id.slice(0, 8)} ${outcome}`);
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
