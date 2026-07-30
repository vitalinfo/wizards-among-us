import { existsSync, readdirSync } from "node:fs";

import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Standalone Node script — load .env.local the way Next does (see also
// drizzle.config.ts). We use Drizzle's own migrator instead of
// `drizzle-kit migrate` because drizzle-kit swallows errors: a stopped database
// and an empty migrations folder both produce an identical, silent exit 1.
loadEnvConfig(process.cwd());

const MIGRATIONS_DIR = "drizzle";

// pg surfaces connection failures as an AggregateError (IPv4 + IPv6) whose own
// message is empty — dig out the underlying detail so the error is legible.
function errorText(err: unknown): string {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join("; ");
  }
  if (err instanceof Error) {
    return err.message || (err as { code?: string }).code || err.name;
  }
  return String(err);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example → .env.local and set it. " +
        "For local dev, run `pnpm db:up` and use " +
        "postgresql://wau:wau@localhost:5433/wau",
    );
  }

  // Phase 0: no migrations exist yet — they're generated in Phase 1 via
  // `pnpm db:generate`. Treat "nothing to apply" as success, not an error.
  const hasMigrations =
    existsSync(MIGRATIONS_DIR) &&
    readdirSync(MIGRATIONS_DIR).some((f) => f.endsWith(".sql"));
  if (!hasMigrations) {
    console.log(
      `No migrations in ./${MIGRATIONS_DIR} yet — generate them with ` +
        "`pnpm db:generate` (Phase 1). Nothing to apply.",
    );
    return;
  }

  const pool = new Pool({ connectionString: url });
  try {
    await pool.query("select 1"); // fail fast with a clear message if unreachable
  } catch (err) {
    await pool.end();
    throw new Error(
      "Could not connect to Postgres — is it running? Try `pnpm db:up`.\n  " +
        errorText(err),
    );
  }

  await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_DIR });
  await pool.end();
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
