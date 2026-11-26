import { loadEnvConfig } from "@next/env";
import { and, asc, eq, isNotNull, notInArray } from "drizzle-orm";

import { getDb } from "@/db";
import { applications, campaigns } from "@/db/schema";

// Read-only report: a parent's applications that name the same child, grouped
// by parent. Drafts and rejected applications are left out — a draft was never
// sent, and a rejection is final (the parent starts a new application), so
// neither is a second wish for the same child.
//
//   pnpm applications:duplicates
//
// Names match after trimming, lower-casing, collapsing whitespace and folding
// the apostrophe variants (', ’, ʼ) — «Мар'яна» and «марʼяна » are one child.
// It does not catch typos or diminutives (Олександр / Сашко).
//
// Only applications in the same campaign count: the same child in this season
// and last season is expected, the same child twice in one campaign is the
// case to look at. Every campaign is checked, and each group names its
// campaign and that campaign's status.
//
// Run against another environment the same way as photos:dedupe, passing that
// app's DATABASE_URL for the one command (README, "Uploaded photos"). It
// prints the database host first. Output carries application and parent ids,
// statuses and campaign titles — never the child's name.
loadEnvConfig(process.cwd());

const EXCLUDED_STATUSES = ["draft", "rejected"] as const;

async function main() {
  printTarget();

  const rows = await getDb()
    .select({
      id: applications.id,
      parentId: applications.parentId,
      childName: applications.childName,
      status: applications.status,
      submittedAt: applications.submittedAt,
      campaignId: applications.campaignId,
      campaign: campaigns.title,
      campaignStatus: campaigns.status,
    })
    .from(applications)
    .innerJoin(campaigns, eq(campaigns.id, applications.campaignId))
    .where(
      and(
        notInArray(applications.status, [...EXCLUDED_STATUSES]),
        isNotNull(applications.childName),
      ),
    )
    .orderBy(asc(applications.parentId), asc(applications.submittedAt));

  // parent id → campaign id + normalized child name → that child's applications
  const byParent = new Map<string, Map<string, typeof rows>>();
  for (const row of rows) {
    const name = normalizeName(row.childName ?? "");
    if (name === "") {
      continue;
    }
    const key = `${row.campaignId}\u0000${name}`;
    const children = byParent.get(row.parentId) ?? new Map();
    byParent.set(row.parentId, children);
    children.set(key, [...(children.get(key) ?? []), row]);
  }

  let parents = 0;
  let groups = 0;
  for (const [parentId, children] of byParent) {
    const duplicates = [...children.values()].filter((apps) => apps.length > 1);
    if (duplicates.length === 0) {
      continue;
    }
    parents += 1;
    console.log(`parent ${parentId}`);
    for (const apps of duplicates) {
      groups += 1;
      console.log(
        `  child #${groups} · ${apps[0].campaign} (${apps[0].campaignStatus}) · ${apps.length} applications`,
      );
      for (const app of apps) {
        console.log(
          `    ${app.id}  ${app.status.padEnd(9)}  ${app.submittedAt?.toISOString() ?? "-"}`,
        );
      }
    }
    console.log("");
  }

  console.log(
    groups === 0
      ? `No parent has two applications for the same child in one campaign (statuses other than ${EXCLUDED_STATUSES.join(", ")}).`
      : `${groups} children with more than one application, across ${parents} parents.`,
  );
}

function normalizeName(name: string) {
  return name
    .normalize("NFC")
    .replace(/['’ʼ`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("uk");
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
