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
- Deploy: `git push heroku HEAD:main` (see README). The whole deploy layer is `Procfile`.

## Stack

Next.js (App Router) + TypeScript + Tailwind · Drizzle ORM + Postgres (Neon, Frankfurt) · app-layer auth (Auth.js/NextAuth or better-auth) · Cloudflare R2 (S3-compatible) + Turnstile · hosted on Heroku (long-lived Node process; pipeline `wau` → apps `wau-staging` / `wau`) · domain `wizards-among-us.pp.ua` with DNS at NIC.UA (not Cloudflare).

**Hosting constraint (learned the hard way):** `src/db/index.ts` caches a `pg.Pool` at module scope. That requires a **long-lived Node process**. It is invalid on Cloudflare Workers / edge runtimes, where a cached pool hangs the second request (sockets can't cross request contexts) — we hit this on a real Workers deploy. Don't propose an edge/serverless host without also changing the data layer (per-request client, Hyperdrive, or an HTTP driver).

## Conventions

- TypeScript strict. Shared **zod** schemas validate on client *and* server (server is authoritative).
- **Enums = readable text** (`text` + `CHECK`) mapped to TS string-literal unions (in `src/db/enums.ts`). Never integer-backed enums. DB values must read as words (`'approved'`, not `3`).
- **DB constraints are a structural safety net, not the validation layer.** Put in the DB only what the app can't guarantee: uniqueness/atomicity (races), FKs, `NOT NULL` for always-present columns, enum CHECKs. Business/range/cross-field validation lives in **zod** (server-authoritative) — don't add value-range CHECKs (e.g. age/rating) to the DB.
- **Timestamps:** every table has `created_at` + `updated_at` (both `default now() not null`; `updated_at` bumped app-side via Drizzle `$onUpdate`), **except** append-only `audit_logs` (created_at only). Use the `timestamps()` helper in `schema.ts`.
- **`schema.ts` hygiene:** table names are **plural** (`users`, `audit_logs`); table definitions are ordered **alphabetically** by name (helpers first) for navigation. Express uniqueness with **unique indexes** (`uniqueIndex(...)`, partial via `.where()` when needed), not `UNIQUE` constraints — uniform, and buildable `CONCURRENTLY` in prod.
- **Settings** is a **key-value** table (`key` text PK, `value` jsonb); keys in `SETTING_KEYS`. New switch = new row, no migration.
- **Authorization in the server layer** via `getSessionActor()` / `requireAdmin()`. No client-side-only checks.
- Migrations are code-defined (Drizzle) and shown before running.
- All UI copy in `uk` locale files. No hardcoded user-facing strings.
- One PR per phase; keep diffs reviewable.

## Invariants — do NOT regress these

- **Portability (hard rule):** depend only on a Postgres `DATABASE_URL`, S3-compatible storage creds, and an app-layer auth library storing to that Postgres. **No** hosting-provider-managed identity tables or BaaS-only APIs in the schema/data access.
- **Identity model:** `users` (parents/volunteers) + `identities` (one row per auth provider — Telegram now, Google/FB later via a new `provider` value). `admins` is a **separate** table (email/password). Admins never appear as `parent_id`/`volunteer_id`. `audit_log.actor_id` is a loose polymorphic ref (`actor_type` `'user'|'admin'`, no FK) + `actor_label` snapshot.
- **Child-data exposure (three tiers — never widen a tier):**
  1. **Browse card** (any signed-in volunteer, pre-claim): child *first* name, age, current region, gift description + price. Nothing else. Enforced by `toBrowseCard`.
  2. **Claiming volunteer only:** `current_town`, `delivery_information`, `parent_name`, `contact`/`contact_method`, and the **`letter_photo` + `child_with_letter_photo`** uploads. Revealed only while that volunteer holds the active claim.
  3. **Admins only, never a volunteer:** the **`idp_certificate`** (довідка ВПО) — a state document about a child.
  Log every view/claim/export in `audit_log`.
- **Child photos:** showing the letter and child-with-letter photos to the claiming volunteer is a **deliberate decision** (Vital, Phase 4), matching the real «Святий Миколай 2025» form. It replaced an earlier stance of not exposing child faces at all, and the landing/parent/volunteer copy was rewritten so we don't promise otherwise — keep copy and behaviour in sync if this changes again. `social_media_consent` is a **separate, freely-answerable** consent for using those photos to promote the initiative; it is never required and must never be conflated with `consent_at`.
- **Indexing:** only `/` is indexable; everything else `noindex`. All data-bearing routes are behind auth + server-layer authz regardless.
- **Campaigns:** one `active` campaign at a time (partial unique index). Parents can submit a *new* application only when there's an active campaign AND `accepting_applications` AND the global kill switch is on. Archive is **derived** (an app is "archived" because its campaign isn't active) — scope all parent/volunteer queries to the active campaign; don't build a separate archive store.
- **Edit lock:** a parent may edit an application only while `draft`/`submitted`; admin approval locks it (server-enforced, not just UI).
- **Claims are atomic:** prevent double-claim via a unique constraint + transaction.
- **Never commit secrets.** Use env vars (see README).

## Phase 1 decisions (resolved)

- **Region taxonomy:** fixed list = the 24 oblasts + Crimea (slugs in `src/db/enums.ts`, UA labels in `messages/uk.json`); city/town is **free text**. Kyiv-city/Sevastopol are not separate values.
- **Gift currency:** **UAH only** — no `gift_currency` column (`gift_price numeric(10,2)`).
- **Enum modeling:** `text` + `CHECK` (not `pgEnum`).
- **Claims:** unique index on `application_id` (one claim/app) — re-claim after release UPDATEs the row.
- **Settings:** key-value table (not a boolean singleton).
- **DB constraints:** structural only — range validation (age/rating) lives in zod, not DB CHECKs. Application content fields stay **nullable** (persisted drafts); required-ness enforced at submit via zod.
- **Timestamps:** `created_at` + `updated_at` on every table except `audit_logs`.
- **schema.ts:** plural table names, alphabetical order, uniqueness via unique **indexes** (not constraints).

## Phase 4 decisions (resolved ahead of build)

- **Telegram `@username` is OPTIONAL and must never gate sign-in.** Telegram doesn't require users to have one; `verifyTelegramLogin` already treats it as optional and `users.username` is nullable. Verified: a username-less login provisions correctly and lands signed in (header falls back to `common.account`). Don't "fix" this by requiring a username to authenticate.
- **Contactability is enforced at SUBMIT/CLAIM, not at login.** Without an `@username` there is no handle a volunteer can click — the stored numeric Telegram id is usable by our *bot*, not by a human. So at the point it matters (parent submits an application; volunteer claims), require a usable contact: use the `@username` automatically when present, otherwise make the person set one (with instructions) or supply an alternative. Keeps the door open for stressed parents and puts friction only where it's justified.
- **Consequence for the schema:** `applications` needs a contact field (nullable in DB per the drafts rule; required at submit via zod).
- **⚠️ Contact info is SENSITIVE** — it belongs with `current_town` / `delivery_information` / `parent_name`, revealed only to the volunteer holding the active claim. It must NOT appear on the browse card (`toBrowseCard`), and every reveal is audit-logged.
- Deferred alternative for later (Phase 7): **bot-mediated contact**, where our bot relays introductions by Telegram id so handles are never exchanged. The Login Widget already requests `data-request-access="write"` with that in mind — but verify the bot can actually message users unsolicited before designing on it.

## Code organization — **feature-based** (decided Phase 4)

Per-resource logic is co-located: `src/features/<resource>/{validation,authz,mappers,queries}.ts` (applications, campaigns, claims — more as they arrive). Schema + validation + authz + queries change together per resource, so they live together.

**The DB schema stays centralized** in `src/db/schema.ts` — a deliberate exception to "everything per feature". Drizzle and drizzle-kit read one schema module; splitting tables across features would mean a barrel plus real circular-import risk between feature schemas (`applications` → `campaigns`/`users`, `claims` → `applications`/`users`), for no gain. Keep its conventions: plural table names, alphabetical order, unique **indexes**.

Two files exist purely to keep the graph acyclic — don't collapse them back:
- **`src/lib/actor.ts`** — `Actor` types + `isAdmin`/`isUser`/`hasRole`. Features import these; `lib/authz.ts` re-exports the features, so putting both in `authz.ts` would be a cycle.
- **`src/lib/enumSchemas.ts`** — the zod enum mirrors. Feature schemas import these; `lib/validation.ts` re-exports the features, so importing them from `validation.ts` was a cycle (it bit us: a `.partial()` on a half-initialized schema).

**`src/lib/authz.ts` is a barrel and the audit surface** — it re-exports every `can*` predicate so the security boundary is greppable in one place. Add new predicates to it. `src/lib/validation.ts` does the same for schemas. Existing call sites can keep importing from the barrels; new feature code may import the feature module directly.

`toBrowseCard`/`BrowseCard` is a DTO **mapper**, not authz — it lives in `features/applications/mappers.ts`. Keep `src/db/enums.ts` **pure** (no zod import) so both `schema.ts` and the zod mirrors derive from the one source of truth.
