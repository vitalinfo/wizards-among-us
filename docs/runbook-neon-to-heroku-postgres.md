# Runbook: move Postgres from Neon to Heroku Postgres (Essential-0)

**Status:** planned, not yet run. Written 2026-11-18. Run by: Vital.

**Why:** staging is already over the Neon free quota and production is close. Heroku
Postgres Essential-0 is cheaper than a paid Neon plan.

**What changes:** the app's `DATABASE_URL`, plus one new config var, `PGSSLMODE`. **No code
change** and no schema change. R2, Turnstile, Telegram and the domain stay as they are.

The order matters: the new database is created and tested **alongside** Neon, and the
switch is the last step. Until maintenance mode is turned off at the end, rolling back means
pointing `DATABASE_URL` back at Neon, and nothing is lost.

---

## 0. Facts this runbook relies on (checked 2026-11-18)

Check these again on the day. If one is no longer true, stop and adjust before continuing.

- **Region.** `wau` and `wau-staging` run in Heroku's `eu` region (AWS eu-west-1, Dublin).
  An add-on is created in its app's region, so the data stays in the EU. (Neon is
  `aws-eu-central-1`, Frankfurt.) The privacy policy doesn't say where data is stored, so
  no copy needs to change.
- **SSL is the one thing that would break.** `src/db/index.ts` and `scripts/migrate.mjs` call
  `new Pool({ connectionString })` and set no `ssl` option. node-postgres (8.22,
  `lib/connection-parameters.js`) reads `PGSSLMODE` **only when the URL has no `sslmode`**.
  - Neon's URL includes `sslmode=require`, so setting `PGSSLMODE` changes nothing for it.
  - Heroku's URL has no `sslmode`. Without `PGSSLMODE` the app would connect without SSL,
    and Heroku refuses that.
  - Use `no-verify`, not `require`. In node-postgres, `require` means "verify the
    certificate", and Heroku's certificates don't chain to a public CA.
- **`DIRECT_DATABASE_URL` is not set** on either app. `scripts/migrate.mjs` prefers it over
  `DATABASE_URL`. If it were still pointing at Neon after the switch, every release phase
  would migrate Neon. Step C1 checks this.
- **Nothing else writes to the database.** `wau` has one `web` dyno and no add-ons (no
  Scheduler). Maintenance mode rewrites every page **and** API route, so it is the whole
  write freeze.
- **The migration history comes over in the dump.** It lives in
  `drizzle.__drizzle_migrations`, outside `public`. Dump the whole database, never `-n public`,
  or the release phase will try to replay all 17 migrations on top of existing tables.
- **Local tools:** `pg_dump` / `pg_restore` 18.4 (Homebrew).
- **Essential-0 limits:** 1 GB of storage and 20 connections. The app uses at most 10 (the
  `pg` pool default × 1 dyno), plus one during the release phase. There is **no
  point-in-time restore**: only `pg:backups`, which Part D schedules.

## Ground rules for the whole run

- **The dump is every child's data.** Keep it in `~/wau-db-move` (mode 700, outside the
  repo). Never paste a connection string into chat, an issue or a PR. Delete the dump when
  you're done (Part D).
- Keep connection strings in shell variables, as below, so they don't end up in your zsh
  history. Always quote them (`"$VAR"`), because zsh treats an unquoted `&` as an operator.
- **No deploys or pipeline promotions to `wau`** from the start of Part C until the end of it.
- **Any error you can't explain is a stop.** Roll back first (§ Rollback) and look into it
  afterwards.

---

## Part A — staging first (tests the setup with no real data)

Staging is already broken (over its Neon quota) and holds nothing worth moving, so it's a
plain swap, not a copy. **Never restore a production dump into staging.**

```bash
heroku config:set PGSSLMODE=no-verify -a wau-staging
heroku config:unset DATABASE_URL -a wau-staging
heroku addons:create heroku-postgresql:essential-0 -a wau-staging --wait
```

With `DATABASE_URL` unset, the add-on attaches **as** `DATABASE_URL`. To match production,
add `--version <N>` with the Neon major version you find in B2.

Build the schema. These are the same 17 migrations already reviewed and applied in
production:

```bash
heroku run -a wau-staging -- node scripts/migrate.mjs
```

```bash
heroku pg:psql -a wau-staging -c "select count(*) from drizzle.__drizzle_migrations"
```

Expect `17`, or whatever `ls drizzle/*.sql | wc -l` says on the day.

Optional: seed one draft campaign and the kill-switch setting. `tsx` isn't on the dyno, so
run this from a checkout:

```bash
DATABASE_URL="$(heroku config:get DATABASE_URL -a wau-staging)" PGSSLMODE=no-verify pnpm db:seed
```

**Check that:** the staging site loads, the FAQ section renders (it reads from the
database), Telegram sign-in works, `heroku logs -a wau-staging` shows no `pg` or SSL errors,
and the next normal `git push` to staging runs its release phase cleanly. That push is the
real proof that `PGSSLMODE` works for `migrate.mjs`.

---

## Part B — production prep (no downtime; any day before the cutover)

### B1. Workspace and the Neon URL

```bash
mkdir -m 700 ~/wau-db-move && cd ~/wau-db-move
```

```bash
heroku config:get DATABASE_URL -a wau > neon-url.txt && chmod 600 neon-url.txt
```

`neon-url.txt` is how you roll back. Once `DATABASE_URL` is unset, Heroku no longer has a
copy of it.

### B2. Version and size

```bash
export NEON_URL="$(cat ~/wau-db-move/neon-url.txt)"
export NEON_DIRECT="${NEON_URL/-pooler/}"
```

```bash
psql "$NEON_DIRECT" -XAt -c "show server_version" -c "select pg_size_pretty(pg_database_size(current_database()))"
```

Dump from the **direct** endpoint (`NEON_DIRECT`), not the pooler. Write down the major
version `N`. The size must be well under 1 GB.

### B3. Create the add-on next to Neon

```bash
heroku config:set PGSSLMODE=no-verify -a wau
```

This restarts the dyno. It has no effect on the Neon connection (see §0). Check that the
site still works before you continue.

```bash
heroku addons:create heroku-postgresql:essential-0 --version <N> --as NEW_DATABASE -a wau --wait
```

```bash
heroku pg:info NEW_DATABASE -a wau
```

The app still uses Neon. The new database is only reachable as `NEW_DATABASE_URL`.

### B4. Rehearsal: dump, restore, compare

Save the row-count query once:

```bash
cat > ~/wau-db-move/counts.sql <<'SQL'
select table_schema || '.' || table_name as tbl,
       (xpath('/row/c/text()',
              query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text::bigint as rows
from information_schema.tables
where table_schema in ('public', 'drizzle') and table_type = 'BASE TABLE'
order by 1;
SQL
```

```bash
export HEROKU_URL="$(heroku config:get NEW_DATABASE_URL -a wau)"
```

```bash
cd ~/wau-db-move && time pg_dump "$NEON_DIRECT" -Fc --no-owner --no-acl -f rehearsal.dump
```

```bash
cd ~/wau-db-move && time pg_restore --no-owner --no-acl --single-transaction -d "$HEROKU_URL" rehearsal.dump
```

`--single-transaction` makes the restore all or nothing. If it fails, read the error. If
it's a Neon-only object that's harmless (for example a comment on an extension), leave it
out with `pg_restore -l rehearsal.dump > list`, delete the line, then
`pg_restore -L list …`. **Use exactly the same flags at the cutover.**

```bash
cd ~/wau-db-move && psql "$NEON_DIRECT" -XAt -f counts.sql > neon.txt && psql "$HEROKU_URL" -XAt -f counts.sql > heroku.txt && diff neon.txt heroku.txt
```

Neon is still live during the rehearsal, so a few new rows in `audit_logs`, `sessions` or
`rate_limits` are expected. At the cutover the diff **must be empty**. Note how long the
dump and the restore took: that, plus about 5 minutes, is your maintenance window.

### B5. Test the app's own connection to the new database

```bash
heroku run -a wau --env "DATABASE_URL=$HEROKU_URL" -- node scripts/migrate.mjs
```

Exit 0 proves that the dyno, `PGSSLMODE` and the new database work together. It should
apply nothing. `migrate.mjs` prints "Migrations applied." either way, so check the count
afterwards:

```bash
psql "$HEROKU_URL" -XAt -c "select count(*) from drizzle.__drizzle_migrations"
```

The count must be the same as it was right after the restore.

```bash
rm ~/wau-db-move/rehearsal.dump
```

---

## Part C — cutover (production downtime)

Pick a quiet hour (Kyiv night) and have the B4 timings at hand. Re-export the variables in
a fresh shell if needed:

```bash
export NEON_URL="$(cat ~/wau-db-move/neon-url.txt)"; export NEON_DIRECT="${NEON_URL/-pooler/}"; export HEROKU_URL="$(heroku config:get NEW_DATABASE_URL -a wau)"
```

### C1. Pre-flight

```bash
heroku config:get DIRECT_DATABASE_URL -a wau
```

This must print nothing. If it prints a value, run `heroku config:unset DIRECT_DATABASE_URL -a wau`.

### C2. Freeze writes

```bash
heroku config:set MAINTENANCE_MODE=true -a wau
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://wizards-among-us.pp.ua/
```

Expect `503`. Wait about 30 seconds for in-flight requests to finish. **From this point
Neon is frozen**, and it is your rollback copy.

### C3. Empty the target

```bash
heroku pg:reset NEW_DATABASE -a wau --confirm wau
```

### C4. Final dump, restore, compare

```bash
cd ~/wau-db-move && pg_dump "$NEON_DIRECT" -Fc --no-owner --no-acl -f final.dump
```

```bash
cd ~/wau-db-move && pg_restore --no-owner --no-acl --single-transaction -d "$HEROKU_URL" final.dump
```

```bash
cd ~/wau-db-move && psql "$NEON_DIRECT" -XAt -f counts.sql > neon.txt && psql "$HEROKU_URL" -XAt -f counts.sql > heroku.txt && diff neon.txt heroku.txt && echo IDENTICAL
```

**This must print `IDENTICAL`.** If it doesn't, go to Rollback.

### C5. Switch

```bash
heroku addons -a wau
```

Note the add-on's name (`postgresql-<words>-<number>`).

```bash
heroku config:unset DATABASE_URL -a wau
```

```bash
heroku addons:attach <addon-name> --as DATABASE -a wau
```

```bash
heroku addons:info <addon-name> -a wau
```

The add-on should now list both `DATABASE` and `NEW_DATABASE`. Each of these config changes
restarts the dyno, and maintenance mode is still on throughout.

### C6. Smoke test while still frozen

```bash
heroku run -a wau -- node scripts/migrate.mjs
```

```bash
heroku pg:psql -a wau -c "select count(*) from drizzle.__drizzle_migrations" -c "select count(*) from applications"
```

`migrate.mjs` exiting 0 proves the app's real `DATABASE_URL` and SSL work. The migration
count must match C4.

### C7. Go / no-go, then reopen

Once maintenance mode is off, a rollback **loses whatever is written to Heroku afterwards**.
Decide now.

```bash
heroku config:unset MAINTENANCE_MODE -a wau
```

**Check that:** the landing page shows the FAQ section (that's a database read), Telegram
sign-in works, the admin queue opens, the volunteer browse page lists children, and
`heroku logs -t -a wau` shows no `pg` or SSL errors.

```bash
heroku pg:info -a wau
```

Expect a few connections, far below 20.

### C8. First backup and a schedule

```bash
heroku pg:backups:capture -a wau
```

```bash
heroku pg:backups:schedule DATABASE_URL --at '03:00 Europe/Kyiv' -a wau
```

```bash
heroku pg:backups -a wau
```

`pg:backups` should list the capture and the schedule.

---

## Rollback

**Before C7 (maintenance still on).** Nothing has been written anywhere since C2, so
nothing is lost:

```bash
heroku addons:detach DATABASE -a wau
```

```bash
heroku config:set DATABASE_URL="$(cat ~/wau-db-move/neon-url.txt)" -a wau
```

```bash
heroku config:unset MAINTENANCE_MODE -a wau
```

`PGSSLMODE` can stay set, because Neon's URL takes precedence over it.

**After C7.** New applications, claims and audit rows exist only on Heroku. Going back means
a reverse migration (maintenance on → dump Heroku → reset Neon → restore → switch). Don't
improvise one at night. Unless the app is actually broken, fix forward.

---

## Part D — afterwards

- **Detach the extra name** once C7 is stable:
  `heroku addons:detach NEW_DATABASE -a wau`. One database with two names is confusing.
- **Delete the dump:** `rm ~/wau-db-move/final.dump ~/wau-db-move/*.txt`.
- **After about a week of stable running:** delete the Neon production project, and the
  staging one. Each is a full copy of the same children's data. Then delete `neon-url.txt`
  and `~/wau-db-move`.
- **Docs that still say Neon:** README (`.env` comments around line 87, the accounts list
  around line 113, the `DATABASE_URL` / `DIRECT_DATABASE_URL` rows in the config-var table)
  and the build plan (§3 step 4 "Neon, Frankfurt", §14 item 1 on backups). Add `PGSSLMODE`
  to the README's config-var table, with the reason from §0.
