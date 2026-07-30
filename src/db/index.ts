import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// Portable Postgres access: standard node-postgres behind `DATABASE_URL`.
// No hosting-provider-specific driver or BaaS API (portability is a hard rule).
// The client is created lazily so importing this module never requires the env
// var at build time — only when a query actually runs (Phase 1+).
//
// Note for Cloudflare deploys: node-postgres works on the Workers runtime with
// the `nodejs_compat` flag (already set in wrangler.jsonc). If we ever move to
// the edge runtime, swap in a serverless PG driver or a pooler — a config-only
// change, no schema/query rewrite.
let pool: Pool | undefined;
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  return db;
}
