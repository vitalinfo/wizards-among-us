import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs as a plain Node process — unlike `next dev`, it does NOT
// auto-load .env.local. Load the same .env* files Next does so DATABASE_URL is
// available here too. Migrations are code-defined and reviewed before applying
// (see CLAUDE.md).
loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example → .env.local and set it. " +
      "For local dev, run `pnpm db:up` and use " +
      "postgresql://wau:wau@localhost:5433/wau",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
