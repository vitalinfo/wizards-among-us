# CLAUDE.md

Operating guide for Claude Code in this repo. Keep it loaded; follow it every session.

**Project:** Wizards Among Us / «Чарівники поруч» — a Ukrainian app connecting parents of war-displaced children with volunteers who fulfill a child's wish per seasonal campaign. UI language: **Ukrainian (`uk`)**.

**Source of truth:** [`docs/wizards-among-us-build-plan.md`](docs/wizards-among-us-build-plan.md). It's authoritative for *what* to build; this file is *how to work + invariants*. If they conflict, the plan wins — flag it.

⚠️ This app stores **personal data about children.** Privacy and safety outrank speed and cleverness.

## Working method

- Build **one phase at a time** (plan §3, Phases 0→8). Never scaffold everything at once.
- For each phase: restate the scope and list what you need from a human → **wait for go-ahead** → implement in **one focused branch/PR** → **show DB migrations/SQL before applying** → add tests + a short docs note → **stop for review** before the next phase.
- **Ask, don't assume** on product decisions. Prefer boring, well-documented approaches.

## Commands

Package manager: **pnpm**. (Scaffolded in Phase 0 with Next.js 16 App Router + TS + Tailwind v4 + next-intl.)
- `pnpm dev` — local dev server (http://localhost:3000)
- `pnpm build` — production build · `pnpm start` — serve the build
- `pnpm lint` / `pnpm typecheck` / `pnpm format:check` — quality gates (also run in CI)
- `pnpm test` — Vitest + React Testing Library (`pnpm test:watch` to watch)
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:seed` — Drizzle migrations / seed (schema lands in Phase 1)
- `pnpm cf:preview` / `pnpm cf:deploy` — Cloudflare Workers (OpenNext) preview / deploy

## Stack

Next.js (App Router) + TypeScript + Tailwind · Drizzle ORM + Postgres · app-layer auth (Auth.js/NextAuth or better-auth) · Cloudflare R2 (S3-compatible) + Turnstile + Pages/DNS.

## Conventions

- TypeScript strict. Shared **zod** schemas validate on client *and* server (server is authoritative).
- **Enums = readable text** (`text` + `CHECK`, or Drizzle `pgEnum`) mapped to TS string-literal unions. Never integer-backed enums. DB values must read as words (`'approved'`, not `3`).
- **Authorization in the server layer** via `getSessionActor()` / `requireAdmin()`. No client-side-only checks.
- Migrations are code-defined (Drizzle) and shown before running.
- All UI copy in `uk` locale files. No hardcoded user-facing strings.
- One PR per phase; keep diffs reviewable.

## Invariants — do NOT regress these

- **Portability (hard rule):** depend only on a Postgres `DATABASE_URL`, S3-compatible storage creds, and an app-layer auth library storing to that Postgres. **No** hosting-provider-managed identity tables or BaaS-only APIs in the schema/data access.
- **Identity model:** `users` (parents/volunteers) + `identities` (one row per auth provider — Telegram now, Google/FB later via a new `provider` value). `admins` is a **separate** table (email/password). Admins never appear as `parent_id`/`volunteer_id`. `audit_log.actor_id` is a loose polymorphic ref (`actor_type` `'user'|'admin'`, no FK) + `actor_label` snapshot.
- **Child-data exposure:** the volunteer **browse card** shows only non-sensitive fields (child first name, age, current region, gift description + price). `current_town`, `delivery_information`, `parent_name`, and family Telegram are revealed **only to the volunteer who claims**. Log every view/claim/export in `audit_log`.
- **Indexing:** only `/` is indexable; everything else `noindex`. All data-bearing routes are behind auth + server-layer authz regardless.
- **Campaigns:** one `active` campaign at a time (partial unique index). Parents can submit a *new* application only when there's an active campaign AND `accepting_applications` AND the global kill switch is on. Archive is **derived** (an app is "archived" because its campaign isn't active) — scope all parent/volunteer queries to the active campaign; don't build a separate archive store.
- **Edit lock:** a parent may edit an application only while `draft`/`submitted`; admin approval locks it (server-enforced, not just UI).
- **Claims are atomic:** prevent double-claim via a unique constraint + transaction.
- **Never commit secrets.** Use env vars (see README).

## Confirm before Phase 1 (plan §14)

- **Region taxonomy:** fixed oblast/city list vs. free text (drives the volunteer filter + schema).
- **Gift currency:** single currency (UAH assumed) vs. add a `gift_currency` column.
