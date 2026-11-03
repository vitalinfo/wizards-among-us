import { loadEnvConfig } from "@next/env";

import {
  deleteBlankDraft,
  listBlankDrafts,
} from "@/features/applications/queries";

// Removes drafts a parent opened and never wrote anything into, in campaigns
// that are not active. Each one is a row with a parent and a campaign and
// nothing else — no answer, no consent, no photo (blankDraftCondition says
// exactly what "blank" means). A draft with anything in it stays, however old:
// that is the parent's to delete, or an admin's from /admin.
//
//   pnpm drafts:cleanup            dry run — reads, changes nothing, prints
//                                  what it would remove
//   pnpm drafts:cleanup --apply    deletes them
//
// Each delete is the same locked transaction as the parent's and the admin's
// (deleteDraft), with the whole blank condition repeated inside it, so a parent
// who starts typing into one between the listing and the delete keeps it.
//
// No storage to clean up: a draft with a file is not blank, and the row lock
// holds off an upload until the delete is done.
//
// Run against another environment the same way as photos:dedupe, passing that
// app's DATABASE_URL for the one command (README, "Uploaded photos"). It
// prints the database host first.
//
// Not audit-logged, for the reason photos:normalize gives — and a blank draft
// holds nothing about a child to account for. The output names drafts by the
// first 8 characters of their id.
loadEnvConfig(process.cwd());

async function main() {
  printTarget();
  const apply = process.argv.slice(2).includes("--apply");

  const drafts = await listBlankDrafts();
  console.log(
    `${apply ? "APPLYING" : "DRY RUN — nothing will change"}: ${drafts.length} blank drafts outside the active campaign\n`,
  );
  for (const draft of drafts) {
    console.log(
      `${draft.id.slice(0, 8)} ${draft.createdAt.toISOString()} ${draft.campaignTitle}`,
    );
  }
  if (!apply || drafts.length === 0) {
    return;
  }

  let removed = 0;
  for (const draft of drafts) {
    const { deleted } = await deleteBlankDraft(draft.id);
    if (deleted) {
      removed += 1;
    }
  }

  console.log(
    `\nRemoved ${removed} drafts.${removed < drafts.length ? ` ${drafts.length - removed} were no longer blank, or already gone.` : ""}`,
  );
}

// Which database this run is about to touch — the host only, never a
// credential.
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
