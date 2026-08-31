# Wizards Among Us — «Чарівники поруч»

A Ukrainian social project that connects **parents of children displaced by the war** with **volunteers** who fulfill a child's wish during seasonal campaigns (New School Year, Christmas, …). Parents submit an application per child; volunteers browse approved children, claim one, and coordinate delivery over Telegram; parents confirm receipt.

**Status:** in development. UI language: Ukrainian (`uk`).

> ⚠️ This app handles **personal data about children**. Privacy and safety are first-class requirements, not polish. Read the "Guardrails" section before writing any code.

---

## Source of truth

The full specification lives in **[`docs/wizards-among-us-build-plan.md`](docs/wizards-among-us-build-plan.md)**. It is authoritative. This README is the *how we work* layer; the plan is the *what we build* layer. If they ever disagree, the plan wins — and open an issue to reconcile them.

The plan includes a designer-facing chapter (Appendix A) that can be shared with a designer independently.

---

## Tech stack

- **Next.js (App Router) + TypeScript** — responsive, mobile-first.
- **Tailwind CSS** for styling.
- **Drizzle ORM** + **Postgres** (the database is treated as plain, portable Postgres behind `DATABASE_URL`).
- **App-layer auth** (Auth.js / NextAuth v5, or better-auth) storing sessions in our own Postgres. Telegram Login Widget for parents/volunteers; email + password for admins.
- **Cloudflare**: R2 (S3-compatible file storage) and Turnstile (captcha) — used as plain APIs, callable from any host.
- **Domain**: `wizards-among-us.pp.ua`, registered at **NIC.UA**, which also serves DNS (`ns10/11/12.uadns.com`).
- Deploy target: **Heroku** (any Node host works — the app is host-agnostic; see [Deploying](#deploying-heroku)).

---

## How we work with Claude Code

**Build the project one phase at a time.** Do not scaffold everything at once. For **each** phase:

1. **Restate** what you're about to build and list any decisions or env vars you need from a human.
2. **Wait** for an explicit go-ahead.
3. **Implement** in a single focused branch / PR.
4. **Show DB migrations / SQL before applying them.**
5. Add **tests** and a short **README/docs** note for what you built.
6. **Stop and wait for review** before starting the next phase.

Never commit secrets. Never introduce a hosting-provider-specific dependency (keep it portable — see Guardrails). When in doubt about a product decision, ask rather than assume.

### Build phases (see plan §3 / §13 for detail)

| Phase | What | Key output |
|---|---|---|
| 0 | Infra & scaffold | Next.js + TS + Tailwind, i18n (`uk`), deploys a hello build |
| 1 | Data layer | Drizzle schema + migrations for all tables; server-layer authz helpers |
| 2 | Public site + indexing policy | Landing + info pages; crawler/noindex policy |
| 3 | Auth | Telegram login (`users` + `identities`); admin email/password (`admins`) |
| 4 | Parent flow | Multistep application form + Turnstile + uploads; my applications (edit-lock) |
| 5 | Admin flow | Campaigns (status + intake + kill switch), moderation queues, export |
| 6 | Volunteer flow | Children list + filters, atomic claim, my claims |
| 7 | Fulfilment loop | Confirmation upload → `fulfilled`; look up my volunteer; reviews |
| 8 | Hardening | Rate limits, validation, audit logging, backups, monitoring, a11y |

---

## Repo conventions

- **TypeScript everywhere**; shared **zod** schemas for validation, reused on client and server.
- **Enums as readable text** (`text` + `CHECK`, or Drizzle `pgEnum`) mapped to TS string-literal unions — never integer-backed enums. DB values must be human-readable (`status = 'approved'`, not `3`).
- **Authorization in the server layer** (server actions / route handlers) via reusable `getSessionActor()` / `requireAdmin()` helpers — not client-side checks. Optional later: Postgres RLS via `SET LOCAL app.current_user_id`.
- **Portability is a hard rule.** The app may depend only on: a Postgres `DATABASE_URL`, S3-compatible storage creds, and an app-layer auth library that stores to that Postgres. No provider-managed identity tables, no BaaS-only APIs in the schema.
- **i18n:** all copy in `uk` locale files; structure so a second language can be added later.
- **Migrations** are code-defined (Drizzle) and reviewed before running.
- One PR per phase; keep changes reviewable.

---

## Guardrails (do not regress these)

- **Child-data privacy.** Minimize what's stored and exposed. The volunteer **browse card** shows only non-sensitive fields (child first name, age, current region, gift description + price). `current_town`, `delivery_information`, `parent_name`, and the family's Telegram are revealed **only to the volunteer who claims**, never on the public list. Log every view/claim/export of child data in `audit_log`.
- **Indexing policy.** Only the landing page (`/`) is indexable. Everything else is `noindex`; all data-bearing routes sit behind auth + server-layer authorization regardless.
- **Consent & retention.** Explicit consent checkbox on the parent form (store timestamp/version). Archived-campaign data is not kept forever — honor the retention policy once defined.
- **Secrets** never enter the repo. Use env vars / a secrets manager.
- **No lock-in.** Nothing hosting-provider-specific in the schema or data access.

---

## Environment variables

Copy `.env.example` → `.env.local` and fill in. Never commit real values.

```
# Database (plain Postgres — Neon, Supabase-as-Postgres, Heroku PG, RDS all work)
DATABASE_URL=           # Neon: the pooled (-pooler) string
DIRECT_DATABASE_URL=    # optional: Neon's direct string, used only by migrations

# Auth
AUTH_SECRET=            # session/JWT signing
TELEGRAM_BOT_TOKEN=     # secret; verifies Login Widget hashes
TELEGRAM_BOT_USERNAME=  # the bot's @username (no @); read server-side, passed to the widget
ADMIN_ALLOWLIST=        # comma-separated emails allowed to self-provision as admin
DEV_LOGIN=              # local only: 1 enables /dev/login (see below). Never set in a deploy.

# Captcha (Cloudflare Turnstile)
TURNSTILE_SITE_KEY=    # not NEXT_PUBLIC_: read server-side, passed as a prop
TURNSTILE_SECRET_KEY=

# File storage (Cloudflare R2 now; any S3-compatible store later)
S3_ENDPOINT=           # R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto         # R2 uses the literal string "auto"
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=             # a SEPARATE bucket per environment
```

External accounts (human task, Phase 0 — see plan §3): domain + DNS (`wizards-among-us.pp.ua` at NIC.UA), Cloudflare (Turnstile + R2), Heroku (app hosting, pipeline `wau`), Neon (Postgres), and a Telegram bot per environment (for the Login Widget).

---

## Local setup

Package manager: **pnpm** (v11+). Node 20+.

```bash
# 1. Install (also enables git hooks via the "prepare" script)
pnpm install

# 2. Configure (optional for Phase 0 — the scaffold runs with no env set)
cp .env.example .env.local   # fill in values as later phases need them

# 3. Database (Phase 1 onward — no schema yet)
pnpm db:migrate              # apply Drizzle migrations
pnpm db:seed                 # optional: seed a draft campaign

# 4. Run
pnpm dev                     # http://localhost:3000
```

### Local services (Docker)

**Only the backing services run in Docker — the app itself does not.** `pnpm dev` runs
Next.js on your host (fastest HMR; Heroku builds from source with a buildpack, not an image),
so there is **no application image to build or rebuild**. `compose.yml` provides just
**Postgres 17** and an optional **Adminer** web UI. (If we ever need a container-parity build,
we'll add a Dockerfile then — we don't have one now, on purpose.)

Requires Docker Desktop (or any Docker Engine) running.

| Command | Underlying `docker compose` | What it does |
|---|---|---|
| `pnpm db:up` | `up -d db` | Start Postgres in the background |
| `pnpm db:down` | `down` | Stop & remove the containers (**data is kept** in the volume) |
| `pnpm db:reset` | `down -v && up -d db` | **Wipe the database** (drops the data volume) and start fresh |
| `pnpm db:logs` | `logs -f db` | Tail Postgres logs |
| — | `docker compose ps` | Show what's running / health |
| — | `docker compose up -d adminer` | Start the Adminer DB UI (not started by `db:up`) |
| — | `docker compose pull` | Pull newer `postgres:17` / `adminer` images |
| — | `docker compose exec db psql -U wau wau` | Open a `psql` shell inside the container |

**Connect** — put this in `.env.local`:

```
DATABASE_URL=postgresql://wau:wau@localhost:5433/wau
```

> Host port is **5433** (not the default 5432) to avoid colliding with any other local
> Postgres you already run. User / password / db are all `wau` (local dev only — see `compose.yml`).

The DB scripts (`db:generate` / `db:migrate` / `db:seed`) auto-load `.env.local` via
`@next/env` — the same files `next dev` reads — so you don't need to export `DATABASE_URL`
in your shell.

`db:migrate` runs `scripts/migrate.mjs` instead of `drizzle-kit migrate`, which gives real
errors (e.g. "is Postgres running?") — drizzle-kit swallows them, reporting a stopped
database and an empty migrations folder identically. That script is **plain `.mjs`, not
TypeScript, on purpose**: it also runs in Heroku's release phase, where devDependencies
(including `tsx`) have been pruned, so it must run on bare `node` using only production
dependencies.

**Adminer UI** (optional): `docker compose up -d adminer`, then http://localhost:8080 —
System: PostgreSQL · Server: `db` · Username / Password: `wau`.

**Data & persistence:** rows live in the named volume `wau_pgdata`, so `db:down` → `db:up`
keeps your data; only `db:reset` (or `docker compose down -v`) erases it. Postgres is only
actually *used* from Phase 1 onward. Node version is pinned in `.nvmrc` (`nvm use`).

### Browsing the dev server from another origin

If you open the dev server as anything other than `http://localhost:3000` — a tunnel, an
internal DNS name, another machine on your LAN — set `DEV_ORIGINS` in `.env.local`:

```
DEV_ORIGINS=my-tunnel.example.com
```

Next blocks cross-origin access to its **dev** resources by default. Without this, HMR
(`/_next/webpack-hmr`) is refused, the browser stops receiving module updates, and Turbopack's
client chunk graph goes stale — you get `module factory is not available` or `Module not found`
for files that plainly exist. The insidious part is that pages still **server-render perfectly**,
so the app looks fine while **nothing hydrates**: every client component is inert, buttons do
nothing, and there is no visible error. We lost a long session to exactly that. Dev only; Next
ignores it in a production build.

### Signing in locally (dev login)

The Telegram Login Widget can't render on `localhost` — it only appears on a domain you've
authorized with BotFather (`/setdomain`). To develop the signed-in parent/volunteer flows
locally **without** a tunnel, set `DEV_LOGIN=1` in `.env.local` and visit
[`/dev/login`](http://localhost:3000/dev/login) (also linked from `/login` when enabled).
It creates a deterministic test user for the role you pick (parent, volunteer, or both) and
starts a real session — same cookie/session machinery as Telegram, just skipping the widget.

> ⚠️ This is a **login backdoor**. It's disabled unless `DEV_LOGIN=1`, and additionally hard-off
> whenever `NODE_ENV=production` — so it can never be reached in a real deploy (the route 404s).
> Keep `DEV_LOGIN` **out of** all staging/prod secrets. It only ever mints a *user* session,
> never an admin one (admins use `/admin/login`).

To verify the real Telegram widget end-to-end, deploy to **staging** with a separate dev bot —
see [Deploying](#deploying-heroku) below.

### Data layer (Phase 1)

Drizzle schema for all tables lives in `src/db/schema.ts` (hand-written; the source of
truth). Enum-like columns are stored as readable `text` + a `CHECK` constraint, mapped to TS
unions in `src/db/enums.ts`. Structural invariants are enforced in the DB (uniqueness, FKs, enum CHECKs): one active
campaign (partial unique index), one claim per application. Settings is a **key-value** table
(`key`/`value`; kill switch = `applications_enabled`). Business/range validation lives in zod,
not DB CHECKs. Every table has `created_at`/`updated_at` (except append-only `audit_log`). Regions are the 24 oblasts + Crimea (slugs in `enums.ts`, Ukrainian labels
in `messages/uk.json`); city/town is free text; gift price is UAH-only.

Authorization is a set of **pure predicates** in `src/lib/authz.ts` (edit-lock, claim rules,
sensitive-field access, browse-card redaction) with direct allow/deny tests — the security
boundary. Session resolution (`getSessionActor`) is wired in Phase 3; these predicates are
what the guards will call. Shared **zod** schemas live in `src/lib/validation.ts` (server is
authoritative).

```bash
pnpm db:up                    # local Postgres (see above)
pnpm db:generate              # edit schema.ts → regenerate migration SQL (review it!)
pnpm db:migrate               # apply pending migrations
pnpm db:seed                  # one draft campaign + settings row (idempotent)
```

### Admin (Phase 5)

Sign in at `/admin/login` (email + password; the address must be in `ADMIN_ALLOWLIST`).
Three surfaces, linked from the shared nav:

- **`/admin/campaigns`** — the list. Activate one (activating archives the incumbent in the
  same transaction, so the "one active campaign" index can never be tripped), open/close
  intake, archive. `/admin/campaigns/new` creates one; `/admin/campaigns/<id>/edit` changes
  title, description and gift cap. The **type** is editable only while the campaign is a
  draft: past that, applications carry `type_fields` validated against it, so changing it
  would leave them describing a form nobody fills in. Enforced in the action *and* in SQL.
- **`/admin/settings`** — the global kill switch. It lives apart from campaigns on purpose:
  `accepting_applications` is a routine per-campaign toggle, this is the emergency stop, and
  it's the only one that stays off across a campaign activation (`accepting_applications`
  defaults to `true`, so activating a campaign otherwise reopens intake immediately).
- **`/admin/applications`** — the moderation queue. Ordered **oldest submission first**: we
  promise parents a review within two days, so newest-first would starve exactly the
  applications that are already late. Filter by status; the default view is everything
  awaiting a decision. Paged at 50 (`MODERATION_PAGE_SIZE`). Filter *and* page live in the url
  and are carried into each application and back out again (`moderationFilter.ts`), so
  returning from one lands on the exact view you left rather than the default queue's first
  page. Changing the filter resets to page 1 — a filter with three results has no page four —
  and a `?page=` beyond the end clamps to the last page instead of showing an empty queue that
  reads as "nothing to review". Ordering breaks ties on `id`: without a total order two rows
  sharing a `submitted_at` could swap between pages and one would never be seen.
- **`/admin/applications/<id>`** — every field, the family's resolved contact, and links to
  the uploaded files (including the ВПО certificate, which **only** an admin may open —
  never a volunteer, not even the one holding the claim).

Every campaign state change — activate, archive, open/close intake, kill switch — confirms
first, in a modal that needs **no client JavaScript**. The trigger is a plain `<Link>` carrying
`?confirm=<action>&id=<id>`; the page re-renders with `ConfirmModal` as a fixed overlay and the
page content marked `inert`; confirming is an ordinary `<form>` posting a server action. The
prompt states what will actually happen rather than asking "are you sure?".

`inert` on the content behind is what makes it a real modal rather than a floating box — without
it, Tab walks into the buttons underneath. Focus starts on the dialog (`autofocus` +
`tabIndex={-1}`), deliberately *not* on the confirm button, so Enter can't complete a
destructive action. The one thing a native `<dialog>` would add is Escape-to-close; that needs a
key handler, so cancelling is a visible control instead.

Why not `<dialog>` + `showModal()`: that version was correct in every browser we could test and
still never ran on the reviewer's machine. Once a submit fallback was added so the button
wasn't dead, it fired with no prompt at all and archived a live campaign. A confirmation whose
only job is to prevent a mistake must not depend on hydration succeeding — if the page
rendered, the confirmation works.

The `?confirm=` value is validated (`isCampaignConfirm`) and must name a real row, so a crafted
or stale link resolves to "nothing pending". The action is chosen from the confirm value, not
from the campaign's current state, so what the admin agreed to is what runs. Actions are
re-authorized server-side regardless.

Approve / reject is one form with two submit buttons, so it works without JS. **Rejection is
final** — the parent cannot edit and resubmit, they start a new application — which is why a
note is required on rejection and is shown to the parent verbatim. The `UPDATE` is guarded on
`status = 'submitted'`, so two admins working the same queue can't both land a decision.

`/admin/applications/<id>/edit` is an **operational override**: approval locks the parent out,
so an admin has to be able to fix a wrong delivery address or a misspelled name. It edits
content fields only — status, campaign and parent are absent, so a typo fix can never move an
application through the workflow. It reuses the parent's zod field rules rather than looser
ones, so an admin can't save an age of 99 either. Two conditional rules:

- **Completeness** is required for anything past `draft`. A draft may legitimately have holes;
  a submitted application was complete and must stay that way, so an admin can't blank out a
  field a volunteer is relying on.
- **The gift cap** is enforced only when the price is actually *changed*. Caps move
  mid-campaign, and an application submitted under an older, higher cap must stay fixable —
  otherwise correcting an address is blocked by a price nobody touched.

Editing a `claimed` application warns first: a volunteer has already seen the old details and
may be out buying the gift.

Opening an application detail page writes an `application.viewed_full` audit entry, as do the
decisions (`application.approved` / `application.rejected`) and edits
(`application.updated_by_admin:<changed,field,names>`). That trail records field **names, never
values** — these fields hold a child's address and the family's story, and `audit_logs` must not
become a second copy of that data with a different retention story. Queue links carry
`prefetch={false}` so a hover never logs a view that nobody made.

#### Export

One export per campaign: the «Експорт» button on the campaigns list downloads the full
working CSV (`/admin/export/download?campaignId=…`), admin-gated and audit-logged as
`campaign.exported`.

It carries the fields the child-data invariant calls sensitive — parent name, current town,
delivery information, family story and the family's contact — so **the file itself is the most
dangerous artifact this system produces**. Treat it accordingly: keep it only where it is
genuinely needed and delete it after the campaign.

It exports no files. The ВПО certificate stays behind the authorized route that logs each read:
a state document about a child does not belong in a spreadsheet that gets emailed around.
Exports are scoped to **one campaign**; a file spanning all of them would resurrect years of
archived families into one spreadsheet.

Cells that begin with `=`, `+`, `-` or `@` are prefixed with an apostrophe: Excel and Google
Sheets otherwise execute them as formulas, and every free-text field here is parent-written.
The file carries a UTF-8 BOM so Excel on Windows reads the Ukrainian correctly.

### Project layout & scripts (Phase 0)

```
src/
  app/                 App Router: layout.tsx, page.tsx, globals.css, api/health/
  components/          UI components (landing.tsx) + __tests__/ specs beside them
  i18n/request.ts      next-intl request config (locale = uk)
  db/                  schema.ts (tables) · enums.ts (enum consts) · index.ts (client) · migrate.ts · seed.ts
  lib/                 authz.ts (authorization predicates) · validation.ts (shared zod) · __tests__/
messages/uk.json       all Ukrainian UI copy incl. region labels (no hardcoded strings)
drizzle/               GENERATED migrations (0000_*.sql + meta/) — don't hand-edit meta/
drizzle.config.ts      Drizzle Kit config (reads DATABASE_URL)
Procfile               the entire deploy layer: `web: pnpm start`
.github/workflows/     ci.yml (lint/typecheck/test/build)
```

Quality gates (all green on `main`, enforced by CI as 4 parallel jobs):
`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`.

**Git hooks:** a `pre-commit` hook (in `git-hooks/`, wired via `core.hooksPath`) runs
Prettier `--write` + ESLint `--fix --max-warnings=0` on your **staged** files and re-stages
the fixes. It installs automatically on `pnpm install`; re-run manually with
`pnpm hooks:install`. Bypass in an emergency with `git commit --no-verify`. The heavier
gates (typecheck/test/build) stay in CI, not the hook, to keep commits fast.

**Stack notes for this scaffold:** Next.js 16 (App Router, Turbopack) · React 19 ·
Tailwind v4 · **next-intl** (`uk`, single-locale, no URL prefix — structured to add
locales later) · Drizzle ORM + **node-postgres** (portable across Node hosts; requires a
long-lived process — see [Deploying](#deploying-heroku)). Whole app is `noindex` by default;
the landing page opts back in during Phase 2.

### Deploying (Heroku)

The app is standard, host-agnostic Next.js running as a **long-lived Node process**. Nothing
host-specific lives in app code — the entire deploy layer is the two-line `Procfile` plus the
config vars below, so moving hosts later is a docs change, not a rewrite.

```
release: pnpm db:migrate
web: pnpm start
```

**Migrations run automatically on every deploy**, in Heroku's `release` phase — before the new
code goes live. If a migration fails the release is **aborted** and the previous version keeps
serving, so a bad migration can't ship a half-broken app. (This is the same shape as
`release: rails db:migrate`.) Note it also runs on `pipelines:promote`, migrating production
against production's own config vars.

> Migrations are reviewed in the PR that introduces them (we show the SQL before applying) —
> the release phase then applies the already-reviewed migration. Nothing unreviewed reaches a
> database this way.

> **Why a long-lived Node process, and not Cloudflare Workers?**
> We tried Workers (via OpenNext) and hit a hard wall: `src/db/index.ts` caches a `pg.Pool` at
> module scope, which is correct on Node but **invalid on Workers** — a pool holds sockets bound
> to the request that opened them, and Workers forbid reusing I/O across request contexts. Every
> DB-backed route alternated OK / hang. The fixes (per-request client, Hyperdrive, or an
> HTTP-only driver) each mean either a data-layer rewrite or provider lock-in, so we host on a
> plain Node process instead. See the comment in `src/db/index.ts`.
> We still use Cloudflare for **R2** (file storage) and **Turnstile** (captcha) — those are plain
> APIs, callable from any host. DNS is at NIC.UA, not Cloudflare.

**Pipeline:** `wau` — staging app `wau-staging`, production app `wau`.

**Runtime config vars** (Heroku *Config Vars*, set per app — never commit them). All are read at
**request time**, so they differ per app and survive a pipeline promotion correctly:

| Var | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string. On Neon use the **pooled** (`-pooler`) string |
| `DIRECT_DATABASE_URL` | *Recommended.* Neon's **direct** (non-`-pooler`) string. Used only by the release-phase migration — Neon recommends direct connections for schema changes, and transaction-mode poolers can break migration locks. Falls back to `DATABASE_URL` if unset |
| `CANONICAL_HOST` | *Recommended.* The one host this app should be served on, no scheme (e.g. `staging.wizards-among-us.pp.ua`). Requests on any other host are redirected to it. Unset = accept whatever host was requested |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN` | BotFather token for **this** environment's bot |
| `TELEGRAM_BOT_USERNAME` | That bot's @username (no `@`) |
| `ADMIN_ALLOWLIST` | Comma-separated admin emails |

> **Why no `NEXT_PUBLIC_*` vars.** Heroku pipeline promotion copies the **compiled slug** from
> staging to production instead of rebuilding. `NEXT_PUBLIC_*` values are inlined into the browser
> bundle at *build* time, so a promoted build would carry **staging's** values into production —
> e.g. rendering the login widget for the staging bot. So the bot username is read on the server
> per request and passed to the client component as a prop. Keep it that way: don't reintroduce a
> `NEXT_PUBLIC_` var for anything that differs between environments.

**Never set `DEV_LOGIN`** on any deployed app — the dev-login backdoor is local-only, and is
additionally hard-disabled whenever `NODE_ENV=production` (which Heroku sets for you).

#### HTTPS and canonical host

`src/middleware.ts` enforces both in production (it's a no-op in local dev):

- **http → https**, as a `308`. Heroku serves the app on both, and browsing over plain http
  silently **drops the session cookie** — it's `Secure` in production — so login appears to
  succeed and then shows you signed out. This is the fix for that class of confusion, and it
  also sends `Strict-Transport-Security` so browsers stop trying http at all.
- **any host → `CANONICAL_HOST`**, as a `307`. Cookies are scoped per host, so bouncing between
  the `herokuapp.com` URL and the custom domain looks exactly like being logged out.

The host redirect is deliberately **temporary (307)** while domains are still being set up — a
permanent redirect to a mistyped canonical host would stick in browser caches. Switch it to 308
at launch. Set `CANONICAL_HOST` to whichever host you point BotFather's `/setdomain` at, so the
login flow and browsing always agree.

#### Staging (needed to test the Telegram widget)

The Telegram Login Widget can't render on `localhost` — it only appears on a BotFather-authorized
domain. A staging app gives you that domain. Order matters: the app must exist before you can set
config vars, and you can't authorize the domain until you know the URL.

1. **Create a separate staging bot** in BotFather. The widget allows one `/setdomain` per bot, so
   don't reuse the production bot. Keep its token secret; you only need the @username now.
2. **Set the config vars** from the table above (the **pooled** string for `DATABASE_URL`, the
   **direct** one for `DIRECT_DATABASE_URL`). Each `heroku config:set` restarts the app:
   ```bash
   heroku config:set --app wau-staging AUTH_SECRET="$(openssl rand -base64 32)"
   ```
   Set the remaining vars the same way, or paste them in the Heroku dashboard to keep secrets out
   of your shell history.
3. **Deploy** — the release phase applies migrations before the new code goes live, so there's no
   separate migration step:
   ```bash
   git push https://git.heroku.com/wau-staging.git HEAD:main
   ```
   Or add the remote once with `heroku git:remote --app wau-staging --remote staging`, then
   `git push staging HEAD:main`.
4. **Authorize the domain**: BotFather → `/setdomain` → the staging bot → the URL you'll actually
   browse (`heroku apps:info --app wau-staging` shows the `herokuapp.com` one). The widget only
   renders on an authorized domain, and it checks the domain the *page* is served from — so if you
   set a custom domain below, use that one here.

#### Custom domain (optional)

The `herokuapp.com` URL is enough for `/setdomain` and for testing. To use
`staging.wizards-among-us.pp.ua` instead:

```bash
heroku domains:add staging.wizards-among-us.pp.ua --app wau-staging
```

That prints a **DNS Target** (`<something>.herokudns.com`). Add it at **NIC.UA** — which serves
our DNS; Cloudflare is not in the DNS path — as a `CNAME` on the `staging` label.

> ⚠️ **Enter the target with a trailing dot** (`xxx.herokudns.com.`). Without it, the value is
> treated as relative to the zone and you get
> `xxx.herokudns.com.wizards-among-us.pp.ua.` — a broken record. Never use an A record; Heroku's
> IPs rotate.

Verify with `dig +short staging.wizards-among-us.pp.ua`, then wait for
`heroku certs:auto --app wau-staging` to report the certificate as OK before pointing BotFather at
the custom domain.

**Promoting to production**: `heroku pipelines:promote --app wau-staging`. This reuses the built
slug — so production must have its **own** config vars (its own database, its own bot token +
username). Set those on `wau` before the first promotion.

**Logs**: `heroku logs --tail --app wau-staging`.

**Dyno size**: use **Basic** ($7/mo), not Eco. Eco dynos sleep after inactivity, and a parent
hitting a multi-second cold start on a stressful errand is not a UX we want to ship.

#### If the first deploy fails

- **`tsc` / `tailwindcss` not found during build** — the buildpack pruned devDependencies before
  building. Force them to stay:
  ```bash
  heroku config:set NPM_CONFIG_PRODUCTION=false YARN_PRODUCTION=false
  ```
- **pnpm not used / wrong version** — the buildpack picks the package manager from the
  `packageManager` field in `package.json` (`pnpm@11.18.0`) via corepack. Don't commit a
  `package-lock.json`; it would make the buildpack choose npm.
- **Node version** — pinned via `engines.node` (`22.x`), matching `.nvmrc`. Heroku reads
  `engines`, not `.nvmrc`, so keep the two in sync.
- **App boots but every page 500s** — almost always a missing config var. Check
  `heroku config` against the table above; `DATABASE_URL` and `AUTH_SECRET` are required.

---

## Open decisions to confirm before Phase 1 (see plan §14)

- **Region taxonomy** — fixed oblast/city list vs. free text (affects filtering quality and the schema).
- **Gift currency** — single currency (UAH assumed) vs. add a `gift_currency` column.

The rest (retention window, one-vs-many active campaigns, per-application reviews) can be settled later without rework.

---

## Kickoff prompt for Claude Code

Paste this as the first message:

> Read `README.md` and `docs/wizards-among-us-build-plan.md` in full. You'll build this project one phase at a time (Phase 0 → 8). For every phase: (1) restate what you're about to build and list any decisions or env vars you need from me; (2) wait for my go-ahead; (3) implement in a single focused branch/PR; (4) show any DB migrations/SQL before applying; (5) add tests and a short docs note; (6) stop and wait for my review before the next phase. Never commit secrets. Don't introduce any hosting-provider-specific dependency — keep it portable per the plan. Respect the child-data privacy guardrails in the README.
>
> Start with **Phase 0 only**: scaffold the app (Next.js App Router + TypeScript + Tailwind + `uk` i18n), set up Drizzle and the project structure, and list every env var and external account you need from me. Do not start Phase 1 yet.

---

## Contributing (humans)

This is a volunteer project. Keep changes small and reviewable, prefer boring well-documented approaches over clever ones, and never expose more child data than a task strictly needs. See the plan for the full rationale behind the architecture.
