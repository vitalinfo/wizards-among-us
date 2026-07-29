import { defineConfig } from "drizzle-kit";

// drizzle-kit reads DATABASE_URL from the environment (e.g. .env.local via your
// shell) when generating/running migrations. Migrations are code-defined and
// reviewed before applying (see CLAUDE.md).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
