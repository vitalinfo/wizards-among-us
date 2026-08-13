import { existsSync, readdirSync } from "node:fs";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Applies Drizzle migrations. Runs in two places:
//   • locally    — `pnpm db:migrate`
//   • on deploy  — Heroku's `release` phase (see Procfile); a non-zero exit
//                  aborts the release, so bad migrations never reach users.
//
// PLAIN .mjs ON PURPOSE — no TypeScript. Heroku prunes devDependencies after the
// build, so `tsx` is gone by the time the release phase runs. This imports only
// production deps (drizzle-orm, pg) and runs on bare `node`.
//
// We use Drizzle's own migrator rather than `drizzle-kit migrate` because
// drizzle-kit swallows errors: a stopped database and an empty migrations folder
// produce an identical, silent exit 1.

// Local dev keeps secrets in .env.local; on Heroku they're real env vars.
// @next/env is a devDependency, so it's absent in the release phase — import it
// optionally, but swallow ONLY "not installed". Anything else is a real bug and
// must surface, or we'd fail later with a misleading "DATABASE_URL is not set".
try {
  const mod = await import("@next/env");
  // @next/env is CommonJS: a dynamic import from ESM puts it under `default`.
  const loadEnvConfig = mod.loadEnvConfig ?? mod.default?.loadEnvConfig;
  if (typeof loadEnvConfig !== "function") {
    throw new Error("@next/env did not export loadEnvConfig");
  }
  loadEnvConfig(process.cwd());
} catch (err) {
  if (err?.code !== "ERR_MODULE_NOT_FOUND") {
    throw err;
  }
  // Pruned in production — env comes from the platform.
}

const MIGRATIONS_DIR = "drizzle";

// pg surfaces connection failures as an AggregateError (IPv4 + IPv6) whose own
// message is empty — dig out the underlying detail so the error is legible.
function errorText(err) {
  if (err instanceof AggregateError && err.errors.length > 0) {
    return err.errors
      .map((e) => (e instanceof Error ? e.message : String(e)))
      .join("; ");
  }
  if (err instanceof Error) {
    return err.message || err.code || err.name;
  }
  return String(err);
}

async function main() {
  // Prefer a direct (non-pooled) connection for DDL. Neon recommends direct
  // connections for schema changes, and transaction-mode poolers can break
  // migration locks. Falls back to DATABASE_URL when no separate URL is set.
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example → .env.local and set it. " +
        "For local dev, run `pnpm db:up` and use " +
        "postgresql://wau:wau@localhost:5433/wau",
    );
  }

  const hasMigrations =
    existsSync(MIGRATIONS_DIR) &&
    readdirSync(MIGRATIONS_DIR).some((f) => f.endsWith(".sql"));
  if (!hasMigrations) {
    console.log(`No migrations in ./${MIGRATIONS_DIR} — nothing to apply.`);
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
