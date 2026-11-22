import { loadEnvConfig } from "@next/env";
import { asc, count, countDistinct, eq, inArray, sum } from "drizzle-orm";

import { getDb } from "@/db";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/db/enums";
import { applicationFiles, applications, campaigns } from "@/db/schema";

// Read-only report: how much stored file data belongs to applications in the
// given statuses, per status, campaign and file kind, with a grand total.
//
//   pnpm files:size                          every status
//   pnpm files:size --status rejected        one status
//   pnpm files:size --status draft,rejected  several
//
// Each line names the campaign's own status too: a draft in the active
// campaign may still be finished, one in an archived campaign never will be.
//
// Sums application_files.size_bytes — the size of the object each row points
// at, written from the same bytes that were uploaded (upload, rotate and
// photos:normalize all set it). It does not list the bucket, so objects no row
// points at (e.g. originals kept by photos:normalize) are not counted.
//
// Run from a checkout, not on a dyno: it needs tsx, a dev dependency Heroku
// prunes. Against another environment, pass that app's DATABASE_URL (and
// PGSSLMODE) for the one command, as photos:dedupe does (README, "Uploaded
// photos"). It prints the database host first. Output carries no child or
// family data — statuses, campaign titles, file kinds and numbers only.
loadEnvConfig(process.cwd());

async function main() {
  printTarget();
  const statuses = parseStatuses(process.argv.slice(2));

  const rows = await getDb()
    .select({
      status: applications.status,
      campaign: campaigns.title,
      campaignStatus: campaigns.status,
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
    .where(inArray(applications.status, statuses))
    .groupBy(
      applications.status,
      campaigns.id,
      campaigns.title,
      campaigns.status,
      applicationFiles.kind,
    )
    .orderBy(
      asc(applications.status),
      asc(campaigns.title),
      asc(applicationFiles.kind),
    );

  console.log(`statuses: ${statuses.join(", ")}\n`);
  if (rows.length === 0) {
    console.log("No files on applications in these statuses.");
    return;
  }

  for (const row of rows) {
    console.log(
      `${row.status} · ${row.campaign} (${row.campaignStatus}) · ${row.kind}: ${row.files} files on ${row.applications} applications, ${formatBytes(row.bytes)}`,
    );
  }

  const files = rows.reduce((total, row) => total + row.files, 0);
  const bytes = rows.reduce((total, row) => total + row.bytes, 0);
  console.log(`\nTotal: ${files} files, ${formatBytes(bytes)} (${bytes} B)`);
}

// `--status a,b` (or `--status=a,b`) → those statuses; no arguments → all of
// them. Anything else fails: a mistyped flag or status must not fall through
// to a report on every application.
function parseStatuses(args: string[]): ApplicationStatus[] {
  if (args.length === 0) {
    return [...APPLICATION_STATUSES];
  }
  const [flag, inline] = args[0].split(/=(.*)/s);
  const value = inline ?? args[1];
  if (flag !== "--status" || args.length > (inline === undefined ? 2 : 1)) {
    throw new Error(`Unexpected arguments: ${args.join(" ")}`);
  }
  const values = (value ?? "").split(",").filter(Boolean);
  const unknown = values.filter(
    (value) => !(APPLICATION_STATUSES as readonly string[]).includes(value),
  );
  if (values.length === 0 || unknown.length > 0) {
    throw new Error(
      `--status takes a comma-separated list of: ${APPLICATION_STATUSES.join(", ")}` +
        (unknown.length > 0 ? ` (got: ${unknown.join(", ")})` : ""),
    );
  }
  return values as ApplicationStatus[];
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
