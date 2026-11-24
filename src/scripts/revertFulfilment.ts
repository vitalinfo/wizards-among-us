import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { admins } from "@/db/schema";
import {
  planFulfilRevert,
  revertFulfilment,
  type FulfilRevertPlan,
} from "@/features/applications/fulfilRevertQueries";
import { getStorage, storageBucket } from "@/lib/storage/client";
import { isUuid } from "@/lib/uuid";

// Undoes a parent's mistaken «отримали»: the application goes back to the
// volunteer who holds it, as `claimed` (or `processed`, if the volunteer had
// marked it so before), the confirmation photo is removed, row and object, and
// so is the parent's review of it. There is no admin screen for this; it has
// happened twice (2026-11-09, 2026-11-24), and the first, done in plain SQL,
// orphaned the photo, kept the review and left no audit trail.
//
//   pnpm fulfilment:revert <application id>                         dry run
//   pnpm fulfilment:revert <application id> --apply --admin <email> reverts
//
// The dry run reads and changes nothing; it prints what the apply would remove
// and the status it would restore. The apply is one transaction (see
// revertFulfilment), audit-logged under the admin named by --admin — the person
// running this is who decided it.
//
// What it cannot undo: the volunteer has already had the `fulfilled` Telegram
// message. When the parent confirms for real, they get it again.
//
// Run against another environment the same way as photos:dedupe, passing ALL
// of that app's DATABASE_URL and S3_* for the one command (README, "Uploaded
// photos"). It prints the database host and bucket first.
loadEnvConfig(process.cwd());

async function main() {
  printTarget();
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const adminFlag = args.indexOf("--admin");
  const adminEmail = adminFlag === -1 ? undefined : args[adminFlag + 1];
  const applicationId = args.find(
    (arg, index) =>
      !arg.startsWith("--") && (adminFlag === -1 || index !== adminFlag + 1),
  );

  if (!applicationId || !isUuid(applicationId)) {
    throw new Error(
      "Usage: pnpm fulfilment:revert <application id> [--apply --admin <email>]",
    );
  }

  if (!apply) {
    const plan = await planFulfilRevert(applicationId);
    if (!plan) {
      throw new Error("No application with that id.");
    }
    console.log("DRY RUN — nothing will change\n");
    printPlan(plan);
    if (plan.blocker) {
      throw new Error(`Would refuse (${plan.blocker}).`);
    }
    return;
  }

  // Resolved before anything is written, and a miss stops the run: an apply
  // whose audit rows name nobody is the failure this script exists to avoid.
  if (!adminEmail || adminEmail.startsWith("--")) {
    throw new Error(
      "--apply needs --admin <email>, the admin it is logged as.",
    );
  }
  const [admin] = await getDb()
    .select({ id: admins.id, email: admins.email })
    .from(admins)
    .where(eq(admins.email, adminEmail))
    .limit(1);
  if (!admin) {
    throw new Error(`No admin with email ${adminEmail} — nothing was changed.`);
  }

  console.log("APPLYING\n");
  const { plan, storageKeys } = await revertFulfilment(applicationId, {
    kind: "admin",
    ...admin,
  });
  printPlan(plan);
  console.log(
    `\nReverted to ${plan.restoreTo}: ${storageKeys.length} confirmation files and ${plan.reviews.length} reviews removed, logged as ${admin.email}.`,
  );
  await deleteObjects(storageKeys);
}

// The objects, after the commit. Not deleteStoredObjects: that one logs a
// failure by count and carries on, which is right inside a request but here
// would leave the person running this believing the photo is gone. The rows
// are already committed, so a failure only needs the object deleted by hand —
// and for that, the key.
async function deleteObjects(keys: string[]) {
  if (keys.length === 0) {
    return;
  }
  let failed = keys;
  try {
    const result = await getStorage().send(
      new DeleteObjectsCommand({
        Bucket: storageBucket(),
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    failed = (result.Errors ?? []).map((error) => error.Key ?? "(no key)");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
  if (failed.length === 0) {
    console.log(`Removed ${keys.length} objects from the bucket.`);
    return;
  }
  console.error(
    `${failed.length} objects were NOT removed from the bucket — delete by hand:`,
  );
  for (const key of failed) {
    console.error(`  ${key}`);
  }
  process.exitCode = 1;
}

// Ids by their first 8 characters, as the other scripts print them; no review
// text, no names.
function printPlan(plan: FulfilRevertPlan) {
  console.log(
    `application ${plan.applicationId.slice(0, 8)}  ${plan.status} → ${plan.restoreTo}`,
  );
  if (plan.blocker) {
    console.log(`  refused: ${plan.blocker}`);
  }
  console.log(`  confirmation files: ${plan.confirmationFiles.length}`);
  for (const file of plan.confirmationFiles) {
    console.log(`    ${file.id.slice(0, 8)} ${file.createdAt.toISOString()}`);
  }
  console.log(`  reviews by the parent: ${plan.reviews.length}`);
  for (const review of plan.reviews) {
    console.log(
      `    ${review.id.slice(0, 8)} ${review.createdAt.toISOString()}${review.isPublished ? " PUBLISHED" : ""}`,
    );
  }
}

// Which database and bucket this run is about to touch — the host only, never
// a credential.
function printTarget() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : "(DATABASE_URL not set)";
  console.log(
    `database: ${database}\nbucket:   ${process.env.S3_BUCKET ?? "(S3_BUCKET not set)"} at ${process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).host : "(S3_ENDPOINT not set)"}\n`,
  );
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    // drizzle wraps a driver error as "Failed query: …"; the reason (a refused
    // connection, a missing column) is only on its cause.
    if (err instanceof Error && err.cause instanceof Error) {
      console.error(`cause: ${err.cause.message}`);
    }
    process.exit(1);
  });
