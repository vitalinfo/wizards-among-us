import { loadEnvConfig } from "@next/env";
import { asc, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { applicationFiles } from "@/db/schema";
import { supersededFiles } from "@/features/applications/files";
import { deleteStoredObjects } from "@/lib/storage/client";

// One-off: remove the files that «Замінити» left behind before an upload
// replaced the previous file of its kind (recordApplicationFile). Each one is
// a photo the parent discarded. Nothing shows it except the admin page, which
// lists every row, and it is still a child's photo in the bucket.
//
// What stays is the NEWEST file of each kind, which is what every page already
// shows (latestByKind). Removing the rest changes nothing a parent or a
// volunteer sees.
//
//   pnpm photos:dedupe            dry run — reads, changes nothing, prints
//                                 what it would remove
//   pnpm photos:dedupe --apply    deletes those rows, then their objects
//
// No "keep the originals" step like photos:normalize. That script replaces a
// photo someone still needs, so its originals are the undo. These are photos
// the parent already replaced, and keeping them is the problem.
//
// Run from a checkout, against another environment the same way as
// photos:normalize: pass ALL of that app's DATABASE_URL and S3_* for the one
// command (README, "Uploaded photos"). It prints the database host and bucket
// first.
//
// Rows are deleted by id, so an upload landing while this runs is safe: the
// upload deletes the old rows of its kind itself, and its new row is not among
// the ids found here. Not audit-logged, for the reason photos:normalize gives.
// The output names files by the first 8 characters of their id.
loadEnvConfig(process.cwd());

async function main() {
  printTarget();
  const apply = process.argv.slice(2).includes("--apply");

  const files = await getDb()
    .select({
      id: applicationFiles.id,
      applicationId: applicationFiles.applicationId,
      kind: applicationFiles.kind,
      createdAt: applicationFiles.createdAt,
    })
    .from(applicationFiles)
    .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));
  const superseded = supersededFiles(files);

  console.log(
    `${apply ? "APPLYING" : "DRY RUN — nothing will change"}: ${superseded.length} replaced files in ${new Set(superseded.map((file) => file.applicationId)).size} applications (of ${files.length} stored)\n`,
  );
  for (const file of superseded) {
    console.log(
      `${file.id.slice(0, 8)} ${file.kind.padEnd(23)} ${file.createdAt.toISOString()}`,
    );
  }
  if (!apply || superseded.length === 0) {
    return;
  }

  // Rows first, then the objects: a failure in between leaves objects nothing
  // points at, which is inert. The reverse would leave rows pointing at nothing.
  const removed = await getDb()
    .delete(applicationFiles)
    .where(
      inArray(
        applicationFiles.id,
        superseded.map((file) => file.id),
      ),
    )
    .returning({ storageKey: applicationFiles.storageKey });
  await deleteStoredObjects(removed.map((row) => row.storageKey));

  console.log(
    `\nRemoved ${removed.length} files.${removed.length < superseded.length ? ` ${superseded.length - removed.length} were already gone.` : ""}`,
  );
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
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
