import { loadEnvConfig } from "@next/env";

// Standalone Node script — load .env.local the same way Next/drizzle-kit do so
// DATABASE_URL is available when this actually seeds (Phase 1).
loadEnvConfig(process.cwd());

// Seed script. No seed data yet — the first draft campaign is seeded in
// Phase 1 (data layer). This stub keeps `pnpm db:seed` runnable from day one.
async function main() {
  console.log("No seed data yet — added in Phase 1 (data layer).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
