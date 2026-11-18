# Runbook: move Postgres from Neon to Heroku Postgres (Essential-0)

**Status:** planned, not yet run. Written 2026-11-18, updated 2026-11-19 so staging gets
the same dump-and-restore move as production. Run by: Vital.

**Why:** staging is already over the Neon free quota and production is close. Heroku
Postgres Essential-0 is cheaper than a paid Neon plan.

**What changes:** each app's `DATABASE_URL`, plus one new config var, `PGSSLMODE`. **No code
change** and no schema change. R2, Turnstile, Telegram and the domain stay as they are.

**The same procedure runs once per app:** first with `APP=wau-staging`, then with
`APP=wau`. Every command below uses `$APP`.

The order matters: the new database is created and tested **alongside** Neon, and the
switch is the last step. Until maintenance mode is turned off at the end, rolling back means
pointing `DATABASE_URL` back at Neon, and nothing is lost.

---

## 0. Facts this runbook relies on (checked 2026-11-19)

Check these again on the day. If one is no longer true, stop and adjust before continuing.

- **Region.** `wau` and `wau-staging` run in Heroku's `eu` region (AWS eu-west-1, Dublin).
  An add-on is created in its app's region, so the data stays in the EU. (Neon is
  `aws-eu-central-1`, Frankfurt.) The privacy policy doesn't say where data is stored, so
  no copy needs to change.
- **Version.** Production Neon runs **Postgres 18.7**. Heroku offers 16, 17 and 18, and 18
  is the default. Create the add-on with `--version 18`: restoring a dump from `pg_dump` 18
  into an older server is not guaranteed to work.
- **Staging Neon is suspended (over quota).** Every connection is refused with "Your
  account or project has exceeded the quota", so it **can't be dumped** until either:
  - the Free-plan compute resets at the start of the next monthly billing period (the
    Neon console shows the date), or
  - the Neon org is upgraded to Launch (usage-based, no minimum). The plan applies to the
    whole org, so every project in it, prod included if it's in the same org, is billed on
    Launch until you downgrade.

  Neon never deletes data over quota; it only refuses connections.
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
- **Nothing else writes to the database.** Each app has one `web` dyno and no add-ons (no
  Scheduler). Maintenance mode rewrites every page **and** API route, so it is the whole
  write freeze.
- **The migration history comes over in the dump.** It lives in
  `drizzle.__drizzle_migrations`, outside `public`. Dump the whole database, never `-n public`,
  or the release phase will try to replay all 17 migrations on top of existing tables.
- **Neon adds a column option that vanilla Postgres rejects.** Both Neon projects carry
  `pg_attver=<n>` on `users.banned_at` (a column added later with `ALTER TABLE`). `pg_dump`
  emits it as `ALTER TABLE ONLY public.users ALTER COLUMN banned_at SET (pg_attver=…);`, and
  Heroku fails the whole restore with `unrecognized parameter "pg_attver"`. That statement is
  part of the `users` table's TOC entry, so `pg_restore -L` can't drop it on its own. The
  restore therefore goes through plain SQL with that one statement filtered out (B4, C4).
  It is internal to Neon and means nothing to Heroku, so dropping it loses nothing. The
  staging rehearsal on 2026-11-19 restored identically this way (14 tables, 17 migrations).
- **A fresh Heroku database isn't completely empty.** It ships with the `pg_stat_statements`
  views in `public`. They're Heroku's, they don't conflict with the dump, and `counts.sql`
  skips them (it counts base tables only).
- **Local tools:** `pg_dump` / `pg_restore` 18.4 (Homebrew).
- **Essential-0 limits:** 1 GB of storage and 20 connections. The app uses at most 10 (the
  `pg` pool default × 1 dyno), plus one during the release phase. There is **no
  point-in-time restore**: only `pg:backups`, which C8 schedules.

## Ground rules for the whole run

- **Both dumps contain children's data,** staging's included. Treat them the same way: keep
  them in `~/wau-db-move/$APP` (mode 700, outside the repo) and delete them when you're done
  (Part D). Never paste a connection string into chat, an issue or a PR.
- **Never restore one app's dump into the other.** Each app's Heroku database gets only its
  own Neon dump.
- Keep connection strings in shell variables, as below, so they don't end up in your zsh
  history. Always quote them (`"$VAR"`), because zsh treats an unquoted `&` as an operator.
- **No deploys or pipeline promotions to `$APP`** from the start of Part C until the end of
  it. A promotion from staging also runs production's release phase.
- **Any error you can't explain is a stop.** Roll back first (§ Rollback) and look into it
  afterwards.

## Order

1. **Staging** (`APP=wau-staging`): Parts A–C, once its Neon is reachable again (see §0).
   Afterwards, a normal `git push` to staging is the real proof that the release phase
   works with `PGSSLMODE`.
2. **Production** (`APP=wau`): Parts A–C.
3. Part D, once, after both.

If production can't wait for staging's Neon to come back, production can go first. Its
Part B (rehearsal plus a dyno connection test, no downtime) already proves everything
except the release phase, and C6 covers that by running `migrate.mjs` on a dyno.

---

## Part A — set the app

Start every shell session for this run with:

```bash
export APP=wau-staging   # or: export APP=wau
```

```bash
export SITE="https://$(heroku config:get CANONICAL_HOST -a "$APP")"
```

`SITE` is the public URL used for the maintenance check. If `CANONICAL_HOST` isn't set on
the app, use its `*.herokuapp.com` address instead.

---

## Part B — prep (no downtime; any day before the cutover)

### B1. Workspace and the Neon URL

```bash
mkdir -p -m 700 ~/wau-db-move/"$APP" && chmod 700 ~/wau-db-move && cd ~/wau-db-move/"$APP"
```

```bash
heroku config:get DATABASE_URL -a "$APP" > neon-url.txt && chmod 600 neon-url.txt
```

`neon-url.txt` is how you roll back. Once `DATABASE_URL` is unset, Heroku no longer has a
copy of it.

### B2. Version and size

```bash
export NEON_URL="$(cat ~/wau-db-move/"$APP"/neon-url.txt)"
export NEON_DIRECT="${NEON_URL/-pooler/}"
```

```bash
psql "$NEON_DIRECT" -XAt -c "show server_version" -c "select pg_size_pretty(pg_database_size(current_database()))"
```

Dump from the **direct** endpoint (`NEON_DIRECT`), not the pooler. The major version should
be 18 (§0). The size must be well under 1 GB. If this fails with "exceeded the quota", that
Neon project is suspended (§0) and you can't go further for this app yet.

List every column option on our tables:

```bash
psql "$NEON_DIRECT" -XAt -c "select attrelid::regclass||'.'||attname||' '||array_to_string(attoptions,',') from pg_attribute where attoptions is not null and attnum > 0 and not attisdropped and attrelid::regclass::text !~ '^pg_' order by 1"
```

Expect exactly one line: `users.banned_at pg_attver=<n>`. Any other option is something
the B4 filter doesn't handle, so stop and look at it before going on.

### B3. Create the add-on next to Neon

```bash
heroku config:set PGSSLMODE=no-verify -a "$APP"
```

This restarts the dyno. It has no effect on the Neon connection (see §0). Check that the
site still works before you continue.

```bash
heroku addons:create heroku-postgresql:essential-0 --version 18 --as NEW_DATABASE -a "$APP" --wait
```

```bash
heroku pg:info NEW_DATABASE -a "$APP"
```

The app still uses Neon. The new database is only reachable as `NEW_DATABASE_URL`.

### B4. Rehearsal: dump, restore, compare

Save the row-count query once (shared by both apps):

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
export HEROKU_URL="$(heroku config:get NEW_DATABASE_URL -a "$APP")"
```

```bash
cd ~/wau-db-move/"$APP" && time pg_dump "$NEON_DIRECT" -Fc --no-owner --no-acl -f rehearsal.dump
```

Turn the dump into plain SQL without Neon's `pg_attver` statement (§0):

```bash
cd ~/wau-db-move/"$APP" && set -o pipefail && (umask 077; pg_restore --no-owner --no-acl -f - rehearsal.dump | sed -E '/^ALTER TABLE ONLY [^ ]+ ALTER COLUMN [^ ]+ SET \(pg_attver=[0-9]+\);$/d' > rehearsal.sql)
```

```bash
cd ~/wau-db-move/"$APP" && grep -c 'pg_attver' rehearsal.sql; grep -c 'PostgreSQL database dump complete' rehearsal.sql
```

Expect `0`, then `1`. The second check is what makes the next step safe: `psql -1` commits
whatever it was given, so a SQL file cut off part-way would restore part-way.

```bash
cd ~/wau-db-move/"$APP" && time psql "$HEROKU_URL" -X -q -1 -v ON_ERROR_STOP=1 -f rehearsal.sql > /dev/null
```

`-1` with `ON_ERROR_STOP` makes the restore all or nothing. If it fails, read the error: a
failed run leaves the target empty, and C3's reset clears it anyway. `rehearsal.sql` holds
the same children's data as the dump, in plain text. **Use exactly the same steps at the
cutover.**

```bash
cd ~/wau-db-move/"$APP" && psql "$NEON_DIRECT" -XAt -f ../counts.sql > neon.txt && psql "$HEROKU_URL" -XAt -f ../counts.sql > heroku.txt && diff neon.txt heroku.txt
```

Neon is still live during the rehearsal, so a few new rows in `audit_logs`, `sessions` or
`rate_limits` are expected. At the cutover the diff **must be empty**. Note how long the
dump and the restore took: that, plus about 5 minutes, is your maintenance window.

### B5. Test the app's own connection to the new database

```bash
heroku run -a "$APP" --env "DATABASE_URL=$HEROKU_URL" -- node scripts/migrate.mjs
```

Exit 0 proves that the dyno, `PGSSLMODE` and the new database work together. It should
apply nothing. `migrate.mjs` prints "Migrations applied." either way, so check the count
afterwards:

```bash
psql "$HEROKU_URL" -XAt -c "select count(*) from drizzle.__drizzle_migrations"
```

The count must be the same as it was right after the restore.

```bash
rm ~/wau-db-move/"$APP"/rehearsal.dump ~/wau-db-move/"$APP"/rehearsal.sql
```

---

## Part C — cutover (downtime for `$APP`)

For production, pick a quiet hour (Kyiv night). Have the B4 timings at hand. In a fresh
shell, run Part A again, then:

```bash
export NEON_URL="$(cat ~/wau-db-move/"$APP"/neon-url.txt)"; export NEON_DIRECT="${NEON_URL/-pooler/}"; export HEROKU_URL="$(heroku config:get NEW_DATABASE_URL -a "$APP")"
```

### C1. Pre-flight

```bash
heroku config:get DIRECT_DATABASE_URL -a "$APP"
```

This must print nothing. If it prints a value, run
`heroku config:unset DIRECT_DATABASE_URL -a "$APP"`.

### C2. Freeze writes

```bash
heroku config:set MAINTENANCE_MODE=true -a "$APP"
```

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/"
```

Expect `503`. Wait about 30 seconds for in-flight requests to finish. **From this point
Neon is frozen**, and it is your rollback copy.

### C3. Empty the target

```bash
heroku pg:reset NEW_DATABASE -a "$APP" --confirm "$APP"
```

### C4. Final dump, restore, compare

```bash
cd ~/wau-db-move/"$APP" && pg_dump "$NEON_DIRECT" -Fc --no-owner --no-acl -f final.dump
```

```bash
cd ~/wau-db-move/"$APP" && set -o pipefail && (umask 077; pg_restore --no-owner --no-acl -f - final.dump | sed -E '/^ALTER TABLE ONLY [^ ]+ ALTER COLUMN [^ ]+ SET \(pg_attver=[0-9]+\);$/d' > final.sql)
```

```bash
cd ~/wau-db-move/"$APP" && grep -c 'pg_attver' final.sql; grep -c 'PostgreSQL database dump complete' final.sql
```

Expect `0`, then `1`. If you get anything else, stop and go to Rollback.

```bash
cd ~/wau-db-move/"$APP" && psql "$HEROKU_URL" -X -q -1 -v ON_ERROR_STOP=1 -f final.sql > /dev/null
```

```bash
cd ~/wau-db-move/"$APP" && psql "$NEON_DIRECT" -XAt -f ../counts.sql > neon.txt && psql "$HEROKU_URL" -XAt -f ../counts.sql > heroku.txt && diff neon.txt heroku.txt && echo IDENTICAL
```

**This must print `IDENTICAL`.** If it doesn't, go to Rollback.

### C5. Switch

```bash
heroku addons -a "$APP"
```

Note the add-on's name (`postgresql-<words>-<number>`).

```bash
heroku config:unset DATABASE_URL -a "$APP"
```

```bash
heroku addons:attach <addon-name> --as DATABASE -a "$APP"
```

```bash
heroku addons:info <addon-name> -a "$APP"
```

The add-on should now list both `DATABASE` and `NEW_DATABASE`. Each of these config changes
restarts the dyno, and maintenance mode is still on throughout.

### C6. Smoke test while still frozen

```bash
heroku run -a "$APP" -- node scripts/migrate.mjs
```

```bash
heroku pg:psql -a "$APP" -c "select (select count(*) from drizzle.__drizzle_migrations) as migrations, (select count(*) from applications) as applications"
```

Unlike plain `psql`, `heroku pg:psql` accepts only one `-c`, so both counts go in one query.
`migrate.mjs` exiting 0 proves the app's real `DATABASE_URL` and SSL work. Both counts must
match C4's `heroku.txt`.

### C7. Go / no-go, then reopen

Once maintenance mode is off, a rollback **loses whatever is written to Heroku afterwards**.
Decide now.

```bash
heroku config:unset MAINTENANCE_MODE -a "$APP"
```

**Check that:** the landing page shows the FAQ section (that's a database read), Telegram
sign-in works, the admin queue opens, the volunteer browse page lists children, and
`heroku logs -t -a "$APP"` shows no `pg` or SSL errors.

```bash
heroku pg:info -a "$APP"
```

Expect a few connections, far below 20.

### C8. First backup and a schedule

```bash
heroku pg:backups:capture -a "$APP"
```

```bash
heroku pg:backups:schedule DATABASE_URL --at '03:00 Europe/Kyiv' -a "$APP"
```

```bash
heroku pg:backups -a "$APP"
```

`pg:backups` should list the capture and the schedule.

---

## Rollback

**Before C7 (maintenance still on).** Nothing has been written anywhere since C2, so
nothing is lost:

```bash
heroku addons:detach DATABASE -a "$APP"
```

```bash
heroku config:set DATABASE_URL="$(cat ~/wau-db-move/"$APP"/neon-url.txt)" -a "$APP"
```

```bash
heroku config:unset MAINTENANCE_MODE -a "$APP"
```

`PGSSLMODE` can stay set, because Neon's URL takes precedence over it. If the app's Neon
project has gone over quota in the meantime, there's no Neon to go back to: fix forward
on Heroku instead.

**After C7.** New applications, claims and audit rows exist only on Heroku. Going back means
a reverse migration (maintenance on → dump Heroku → reset Neon → restore → switch). Don't
improvise one at night. Unless the app is actually broken, fix forward.

---

## Part D — afterwards (once both apps are moved)

- **Detach the extra name** on each app once C7 is stable:
  `heroku addons:detach NEW_DATABASE -a <app>`. One database with two names is confusing.
- **Delete the dumps:** `rm ~/wau-db-move/*/final.dump ~/wau-db-move/*/final.sql ~/wau-db-move/*/*.txt`.
- **After about a week of stable running:** delete both Neon projects. Each is a full copy of
  that app's data. Then delete `~/wau-db-move` (it holds both `neon-url.txt` files).
- **If you upgraded the Neon org to Launch** to get staging's dump, downgrade it to Free
  (Billing page, admin only). **Deleting the projects does not stop Launch billing:** only
  an explicit downgrade does. The org has to fit Free limits when you downgrade (at most
  1 GB of storage and 10 branches per project); if it doesn't, Neon shows an error instead.
  Downgrading also resets the Free plan's monthly compute allowance.
- **Docs that still say Neon:** README (`.env` comments around line 87, the accounts list
  around line 113, the `DATABASE_URL` / `DIRECT_DATABASE_URL` rows in the config-var table)
  and the build plan (§3 step 4 "Neon, Frankfurt", §14 item 1 on backups). Add `PGSSLMODE`
  to the README's config-var table, with the reason from §0.
