import { loadEnvConfig } from "@next/env";
import { asc, count, countDistinct, eq, sum } from "drizzle-orm";

import { getDb } from "@/db";
import { applicationFiles, applications, campaigns } from "@/db/schema";

// Read-only report: how much stored file data belongs to rejected
// applications, per campaign and file kind, with a grand total.
//
//   pnpm files:rejected-size
//
// Sums application_files.size_bytes — the size of the object each row points
// at, written from the same bytes that were uploaded (upload, rotate and
// photos:normalize all set it). It does not list the bucket, so objects no row
// points at (e.g. originals kept by photos:normalize) are not counted.
//
// Run from a checkout, not on a dyno: it needs tsx, a dev dependency Heroku
// prunes. Against another environment, pass that app's DATABASE_URL (and
// PGSSLMODE) for the one command, as photos:dedupe does (README, "Uploaded
// photos"). It prints the database host first. Output carries no child or family data —
// campaign titles, file kinds and numbers only.
loadEnvConfig(process.cwd());

async function main() {
  printTarget();

  const rows = await getDb()
    .select({
      campaign: campaigns.title,
      kind: applicationFiles.kind,
      applications: countDistinct(applicationFiles.applicationId),
      files: count(applicationFiles.id),
      bytes: sum(applicationFiles.sizeBytes).mapWith(Number),
    })
    .from(applicationFiles)
    .innerJoin(
      applications,
      eq(applications.id, applicationFiles.applicationId),
    )
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(eq(applications.status, "rejected"))
    .groupBy(campaigns.id, campaigns.title, applicationFiles.kind)
    .orderBy(asc(campaigns.title), asc(applicationFiles.kind));

  if (rows.length === 0) {
    console.log("No files on rejected applications.");
    return;
  }

  for (const row of rows) {
    console.log(
      `${row.campaign} · ${row.kind}: ${row.files} files on ${row.applications} applications, ${formatBytes(row.bytes)}`,
    );
  }

  const files = rows.reduce((total, row) => total + row.files, 0);
  const bytes = rows.reduce((total, row) => total + row.bytes, 0);
  console.log(`\nTotal: ${files} files, ${formatBytes(bytes)} (${bytes} B)`);
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

// Which database this run reads — the host only, never a credential.
function printTarget() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : "(DATABASE_URL not set)";
  console.log(`database: ${database}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
