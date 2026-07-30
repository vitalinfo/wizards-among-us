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
- **Cloudflare**: R2 (S3-compatible file storage), Turnstile (captcha), DNS/Pages, Bot Fight Mode.
- Deploy target: Cloudflare Pages (or any Node host — the app is host-agnostic).

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
AUTH_SECRET=                  # session/JWT signing
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
ADMIN_ALLOWLIST=              # comma-separated emails allowed to self-provision as admin

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

External accounts to set up (human task, Phase 0 — see plan §3): domain (`.xyz` via NIC.UA), Cloudflare (DNS + Turnstile + R2 + Pages), a Postgres provider, and a Telegram bot (for the Login Widget).

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
Next.js on your host (fastest HMR; the deploy target is Cloudflare Workers, not a container),
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

**Adminer UI** (optional): `docker compose up -d adminer`, then http://localhost:8080 —
System: PostgreSQL · Server: `db` · Username / Password: `wau`.

**Data & persistence:** rows live in the named volume `wau_pgdata`, so `db:down` → `db:up`
keeps your data; only `db:reset` (or `docker compose down -v`) erases it. Postgres is only
actually *used* from Phase 1 onward. Node version is pinned in `.nvmrc` (`nvm use`).

### Project layout & scripts (Phase 0)

```
src/
  app/                 App Router: layout.tsx, page.tsx, globals.css, api/health/
  components/          UI components (landing.tsx) + __tests__/ specs beside them
  i18n/request.ts      next-intl request config (locale = uk)
  db/                  Drizzle client (index.ts), schema.ts (empty until Phase 1), seed.ts
messages/uk.json       all Ukrainian UI copy (no hardcoded user-facing strings)
drizzle.config.ts      Drizzle Kit config (reads DATABASE_URL)
open-next.config.ts + wrangler.jsonc   thin Cloudflare Workers deploy layer
.github/workflows/     ci.yml (lint/typecheck/test/build) · deploy.yml (manual, Cloudflare)
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
locales later) · Drizzle ORM + **node-postgres** (portable, works on Node hosts and on
Cloudflare Workers via `nodejs_compat`). Whole app is `noindex` by default; the landing
page opts back in during Phase 2.

### Deploying to Cloudflare (thin layer)

The app is standard, host-agnostic Next.js; Cloudflare is added via
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) (Workers, the successor to
`next-on-pages` for Next.js). `pnpm cf:preview` builds and previews locally;
`pnpm cf:deploy` deploys. Auto-deploy on `main` is wired but **disabled** until you set two
GitHub repo secrets — `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` — and flip
`.github/workflows/deploy.yml` from `workflow_dispatch` to `push`.

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
