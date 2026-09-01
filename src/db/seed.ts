import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";

import { SETTING_KEYS } from "./enums";
import { getDb } from "./index";
import { campaigns, settings } from "./schema";

// Standalone Node script — load .env.local the way Next/drizzle-kit do.
loadEnvConfig(process.cwd());

const DRAFT_CAMPAIGN = {
  type: "saint_nicholas_day" as const,
  title: "Святий Миколай 2026",
  description: "Чернетка кампанії, створена сідером для локальної розробки.",
};

// Idempotent: safe to run repeatedly. Seeds the singleton settings row (kill
// switch on) and one DRAFT campaign — never an active one, so the one-active
// invariant stays intact.
async function main() {
  const db = getDb();

  // Kill switch on by default (key-value settings row).
  await db
    .insert(settings)
    .values({ key: SETTING_KEYS.applicationsEnabled, value: true })
    .onConflictDoNothing();

  const existing = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.title, DRAFT_CAMPAIGN.title))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(campaigns).values({ ...DRAFT_CAMPAIGN, status: "draft" });
    console.log(`Seeded draft campaign: ${DRAFT_CAMPAIGN.title}`);
  } else {
    console.log(`Draft campaign already present: ${DRAFT_CAMPAIGN.title}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
