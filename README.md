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
- **Cloudflare**: R2 (S3-compatible file storage), Turnstile (captcha), DNS, Bot Fight Mode — used as plain APIs, callable from any host.
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
DATABASE_URL=
DATABASE_URL_POOLED=          # only if deploying on edge/Workers

# Auth
AUTH_SECRET=                        # session/JWT signing
TELEGRAM_BOT_TOKEN=                  # secret; verifies Login Widget hashes (server-only)
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=  # public; browser-exposed so the widget can render
ADMIN_ALLOWLIST=                    # comma-separated emails allowed to self-provision as admin

# Captcha (Cloudflare Turnstile)
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# File storage (Cloudflare R2 now; any S3-compatible store later)
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=
S3_PUBLIC_BASE_URL=
```

External accounts to set up (human task, Phase 0 — see plan §3): domain (`.xyz` via NIC.UA), Cloudflare (DNS + Turnstile + R2), Heroku (app hosting), a Postgres provider (Neon), and a Telegram bot (for the Login Widget).

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
in your shell. No migrations exist until Phase 1 generates them (`pnpm db:generate`), so
`db:migrate` currently reports "nothing to apply" and exits cleanly. `db:migrate` runs a
small script (`src/db/migrate.ts`) instead of `drizzle-kit migrate`, which gives real
errors (e.g. "is Postgres running?") — drizzle-kit swallows them.

**Adminer UI** (optional): `docker compose up -d adminer`, then http://localhost:8080 —
System: PostgreSQL · Server: `db` · Username / Password: `wau`.

**Data & persistence:** rows live in the named volume `wau_pgdata`, so `db:down` → `db:up`
keeps your data; only `db:reset` (or `docker compose down -v`) erases it. Postgres is only
actually *used* from Phase 1 onward. Node version is pinned in `.nvmrc` (`nvm use`).

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
host-specific lives in app code — the entire deploy layer is one line in `Procfile`
(`web: pnpm start`) plus the config vars below, so moving hosts later is a docs change, not a
rewrite.

> **Why a long-lived Node process, and not Cloudflare Workers?**
> We tried Workers (via OpenNext) and hit a hard wall: `src/db/index.ts` caches a `pg.Pool` at
> module scope, which is correct on Node but **invalid on Workers** — a pool holds sockets bound
> to the request that opened them, and Workers forbid reusing I/O across request contexts. Every
> DB-backed route alternated OK / hang. The fixes (per-request client, Hyperdrive, or an
> HTTP-only driver) each mean either a data-layer rewrite or provider lock-in, so we host on a
> plain Node process instead. See the comment in `src/db/index.ts`.
> We still use Cloudflare for **R2** (file storage), **Turnstile** (captcha) and DNS — those are
> plain APIs, callable from any host.

**Runtime config vars** (Heroku *Config Vars*, set per app — never commit them):

| Var | Value |
|---|---|
| `DATABASE_URL` | Postgres connection string. On Neon use the **pooled** (`-pooler`) string |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN` | BotFather token for **this** environment's bot |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | The bot's @username (no `@`). Public — inlined into the browser bundle at **build** time, so it must be set *before* the build that ships it |
| `ADMIN_ALLOWLIST` | Comma-separated admin emails |

**Never set `DEV_LOGIN`** on any deployed app — the dev-login backdoor is local-only, and is
additionally hard-disabled whenever `NODE_ENV=production` (which Heroku sets for you).

#### Staging (needed to test the Telegram widget)

The Telegram Login Widget can't render on `localhost` — it only appears on a BotFather-authorized
domain. A staging app gives you that domain. Order matters: the app must exist before you can set
config vars, and you can't authorize the domain until you know the URL.

1. **Create a separate dev bot** in BotFather. The widget allows one `/setdomain` per bot, so
   don't reuse the production bot. Keep its token secret; you only need the @username now.
2. **Create the app** in the EU region (data residency — this app stores children's data):
   ```bash
   heroku create wizards-among-us-staging --region eu
   ```
3. **Apply migrations**, using the database's **direct** (non-`-pooler`) connection string —
   Neon recommends direct connections for schema changes:
   ```bash
   (read -rs "DATABASE_URL?Paste the staging DIRECT URL: " && export DATABASE_URL && pnpm db:migrate)
   ```
   The subshell keeps the value out of your shell history and out of later commands.
4. **Set the config vars** from the table above (use the **pooled** string for `DATABASE_URL`).
   Each `heroku config:set` restarts the app:
   ```bash
   heroku config:set --app wizards-among-us-staging AUTH_SECRET="$(openssl rand -base64 32)"
   ```
   Set the remaining vars the same way, or paste them in the Heroku dashboard to keep secrets out
   of your shell history.
5. **Deploy**:
   ```bash
   git push heroku HEAD:main
   ```
   Use `heroku git:remote --app wizards-among-us-staging` first if the remote isn't set.
6. **Authorize the domain**: BotFather → `/setdomain` → the dev bot → the app's URL
   (`heroku apps:info` shows it). The widget only renders on an authorized domain.

**Logs**: `heroku logs --tail --app wizards-among-us-staging`.

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
