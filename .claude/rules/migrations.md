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

Drizzle records the **sha256 of the raw file** in `drizzle.__drizzle_migrations`.
Rewriting an applied file therefore orphans its journal row: the next
`pnpm db:migrate` sees an unknown hash and re-runs the DDL, which fails on
`column already exists`.

So: a file that has reached any database is immutable in practice — correct it with
a NEW migration. If it has only reached a dev database and rewriting it is still
the cleaner history, say exactly what the reconcile is (restore the data the old
file changed, re-point the journal hash) and leave it to the developer to run.

### Conventions

- The schema is one module, `src/db/schema.ts` (see CLAUDE.md for why).
- Structural constraints only: uniqueness, FKs, `NOT NULL`, enum `CHECK`s. Range
  and cross-field validation lives in zod.
- Additive first. A column the app has not shipped yet is nullable; narrowing or
  dropping is a separate, later migration once no code reads it.
- A new requirement constrains new data. Existing rows predate it, so do not
  retrofit it into a validator that an admin needs to fix an old record with.
