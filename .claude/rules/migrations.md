## Database migrations

Migrations are code-defined (Drizzle, `drizzle/`), generated with `pnpm db:generate`
and applied with `pnpm db:migrate`. On Heroku they run in the `release` phase, so a
migration that fails aborts the release before it reaches users.

### Hard rule: never apply a migration without review

**Generating is yours; applying is not.** Write the schema change, run
`pnpm db:generate`, and then **stop**: print the generated SQL in full and wait for
the developer to look at it. This holds for every environment, the local dev
database included — Vital tests against the same database the app uses, so an
applied migration is a change to data someone is working with.

- "Run the migration" in a prompt is **not** the review. It authorizes the apply of
  SQL that has already been shown and looked at; if the SQL changed since, or was
  never printed, show it and ask again.
- Never apply as a side effect of something else — not to make a dev server boot,
  not to get a test green, not to check your own work.
- Never apply to staging or production. `git push heroku` does that, and it is the
  developer's call when.

### A schema migration contains SCHEMA

**Do not put a data or content change in it.** `ALTER TABLE` is reviewed as a
structural change; a row of copy is reviewed as copy, by the person who owns the
words. Bundling the two means approving one approves the other silently — which is
exactly how an admin-managed FAQ answer got rewritten by a migration whose review
was about a new column (Oct 2026, `child_gender`).

Admin-managed content — `faqs`, `settings` — belongs in its own admin screen. When
content genuinely has to ship as SQL (`0009` seeded the FAQ table, because
`pnpm db:migrate` is the only path that reaches production), say so in its own
sentence and get it approved **as content**, separately from the schema.

A data statement that does survive review:
- is guarded, so re-running it changes nothing (`WHERE NOT EXISTS`, or matched on
  the exact prior value);
- never overwrites an edit a human made deliberately — match the value you expect
  to replace, and report it when the match finds nothing;
- says in a comment why it is here rather than in the admin UI.

### Editing a migration that has already been applied

**What the migrator actually compares is the TIMESTAMP, not the hash.** Read it
before reasoning about it — `pg-core/dialect.js`, `migrate()`:

```js
const dbMigrations = await session.all(sql`select id, hash, created_at from … order by created_at desc limit 1`);
const lastDbMigration = dbMigrations[0];
for await (const migration of migrations) {
  if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) { …apply… }
}
```

One row is read — the newest — and a file runs only when its folder timestamp is
GREATER. The sha256 is written to the table and never read again. Two consequences,
and the second is the dangerous one:

- **Rewriting an applied file does not re-run it.** The timestamp is unchanged, so
  the migrator skips it, and the stale hash in the journal is cosmetic. (This
  paragraph used to claim the opposite — that an edited file re-runs and fails on
  `column already exists`. It does not, and a reconcile "fixing" the hash changes
  nothing. Corrected after a prediction made from the stored hash rather than from
  the source.)
- **A migration with an OLDER timestamp than one already applied is skipped
  silently, forever.** Generate on a branch, let someone else's newer migration land
  first, merge, and yours never runs — no error, exit 0, a column simply missing in
  production. If two branches both generated migrations, check the timestamps against
  `drizzle.__drizzle_migrations` before trusting a green deploy.

Rewriting an applied file still leaves the DATA it changed applied — the schema is
skipped, but the UPDATE it ran already happened. So: a file that has reached any
database is immutable in practice — correct it with a NEW migration. If it has only
reached a dev database and rewriting it is still the cleaner history, say exactly
what has to be undone by hand and leave it to the developer to run.

### Conventions

- The schema is one module, `src/db/schema.ts` (see CLAUDE.md for why).
- Structural constraints only: uniqueness, FKs, `NOT NULL`, enum `CHECK`s. Range
  and cross-field validation lives in zod.
- Additive first. A column the app has not shipped yet is nullable; narrowing or
  dropping is a separate, later migration once no code reads it.
- A new requirement constrains new data. Existing rows predate it, so do not
  retrofit it into a validator that an admin needs to fix an old record with.
