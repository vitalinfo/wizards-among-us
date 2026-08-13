import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

// Portable Postgres access: standard node-postgres behind `DATABASE_URL`.
// No hosting-provider-specific driver or BaaS API (portability is a hard rule).
// The client is created lazily so importing this module never requires the env
// var at build time — only when a query actually runs (Phase 1+).
//
// The pool is cached at module scope and shared across requests. That is correct
// on a long-lived Node process (our deploy target — see README) and is why we
// host on one.
//
// ⚠️ It is NOT valid on Cloudflare Workers / edge runtimes. A pool is stateful:
// its sockets belong to the request that opened them, and Workers forbid reusing
// I/O across request contexts, so a cached pool hangs the second request
// ("Worker exceeded CPU/hung"). We hit exactly that on a Workers deploy: every
// DB-backed route alternated OK / hang. Moving to an edge runtime therefore
// means a per-request client (closed via waitUntil), a pooler like Hyperdrive,
// or an HTTP-based driver — a data-layer change, not just config.
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
