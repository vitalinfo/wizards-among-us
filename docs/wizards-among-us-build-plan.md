# Wizards Among Us — Build Plan / Claude Code Brief
**Project name:** "Wizards Among Us" / «Чарівники поруч»
**Purpose:** A Ukrainian social project that helps parents of children displaced by the war. Parents submit wish applications for their kids for a given campaign (e.g. New School Year, Christmas); volunteers browse approved children and "claim" one to fulfill their wish, coordinating via Telegram; parents later upload proof the gift was received.

> This document is written to be handed to Claude Code as the source of truth. Work through it phase by phase. Confirm the "Open decisions" section with the project owner before Phase 1.

---

## 1. Principles & constraints

- **Volunteer-maintained.** Favor boring, well-documented technology over clever. One language across the stack. Minimal moving parts.
- **Free or near-free** to run. Budget tolerance to be confirmed (see Open decisions).
- **Ukrainian-language** UI (`uk`). Keep copy in i18n files so it can be edited without touching code.
- **Sensitive data.** This system holds information about displaced children and connects them with adult strangers. Privacy and safety are first-class requirements, not an afterthought (see §11).
- **Closed to crawlers.** The site must not be indexed (see §10).
- **Responsive** (desktop + mobile). SPA-like feel is nice-to-have, not required.

---

## 2. Recommended stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | SSR + client interactivity; responsive; huge contributor pool; AI-tooling-friendly. |
| Styling | **Tailwind CSS** | Fast, consistent, responsive utilities. Add a small component layer (shadcn/ui optional). |
| Database | **Postgres behind `DATABASE_URL`** (Neon or Supabase-as-Postgres for the free tier) | Treated as plain, portable Postgres — no BaaS-specific features. Movable to Heroku Postgres / RDS via `pg_dump`. Free tiers idle/suspend when quiet (keep-warm ping or paid plan). |
| ORM / migrations | **Drizzle** (TS-first) or Prisma | Schema + migrations defined in code; run on any host. Reinforces portability. |
| Auth | **App-layer, host-agnostic**: Auth.js (NextAuth v5) or better-auth, storing users/sessions in *your* Postgres. Telegram Login Widget (parents+volunteers) via a custom verify step; email/password credentials for admin. | No provider-managed identity tables. Telegram = the project's identity anchor. |
| Authorization | **Server layer** (Next.js server actions / route handlers) via the ORM, keyed off session user id + role | Portable. Optional later: Postgres RLS via a per-transaction `SET LOCAL app.current_user_id` (works on any Postgres). |
| File storage | **Cloudflare R2** (10 GB, zero egress), S3-compatible | Swap to AWS S3 / MinIO by changing credentials only. |
| Captcha | **Cloudflare Turnstile** (free) | On the parent application form. |
| DNS | **NIC.UA** (`ns10/11/12.uadns.com`) — *as built* | Originally planned to move nameservers to Cloudflare; we didn't. Cloudflare is still used for Turnstile + R2, which don't require it to serve DNS. |
| Domain | **`wizards-among-us.pp.ua` via NIC.UA** — *as built* | Was planned as a `.xyz`; a free `.pp.ua` was registered instead. Fine for a noindex site. |
| Captcha / bot protection | **Cloudflare Turnstile** (free) | Cloudflare's Bot Fight Mode needs Cloudflare-served DNS, so it isn't in play. |
| Hosting | **Heroku** (pipeline `wau` → `wau-staging` / `wau`, EU region, Basic dyno ~$7/mo) — *as built* | Was planned as Cloudflare Pages/Workers. **We tried Workers and reverted:** a module-scoped `pg.Pool` can't be reused across Workers request contexts, so every DB-backed route alternated OK/hang. The app needs a long-lived Node process — see README §Deploying. |

**Fully-free alternative:** Next.js on Cloudflare Pages/Workers + **D1** (SQLite) + **R2** + `better-auth`. Truly $0 and commercial-OK, but more assembly. Note D1 (SQLite) is less portable than Postgres — only pick it if you're confident you'll stay on Cloudflare.

> **Portability principle:** the app depends only on (a) a Postgres connection string, (b) S3-compatible storage credentials, and (c) an app-layer auth library that stores to that Postgres. No hosting-provider-specific tables or APIs in the schema. Moving to Heroku/AWS/RDS is a config change (connection string + storage creds + redeploy), not a refactor.

> Pricing/limits above were current as of mid-2026 but change often — re-verify before committing.

---

## 3. Infrastructure setup checklist (Phase 0)

> **Status: done, with deviations.** What we actually built is recorded below; see README for the
> operational detail. Deviations from the original plan are marked *as built*.

1. **Domain:** ~~register a `.xyz`~~ → registered **`wizards-among-us.pp.ua`** at NIC.UA (*as built*). Freenom-style free TLDs (.tk/.ml/.ga) are dead (Freenom exited in 2024) — don't use them.
2. ~~Switch nameservers to Cloudflare~~ → **DNS stays at NIC.UA** (`ns10/11/12.uadns.com`) (*as built*). Cloudflare is used only for Turnstile + R2, neither of which requires it to serve DNS. Custom subdomains are `CNAME`s to the Heroku DNS target — enter the target **with a trailing dot** or NIC.UA appends the zone to it.
3. Create a **Turnstile** widget in Cloudflare (site key + secret). (Bot Fight Mode / Cloudflare SSL don't apply — they need Cloudflare-served DNS.)
4. Provision a **Postgres** database → **Neon, `aws-eu-central-1` (Frankfurt)** (*as built*), chosen for EU data residency and proximity to Ukraine. A project's region can't be changed later. Use the **direct** connection string for migrations and the **pooled** (`-pooler`) one for the running app.
5. Create a **Cloudflare R2** bucket for uploads; create an API token (S3-compatible creds).
6. Create the Next.js repo (GitHub). Configure environment variables (never commit secrets):
   - `DATABASE_URL`
   - `AUTH_SECRET` (session/JWT signing for the auth library)
   - `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (Login Widget: the token verifies the hash; the username renders the button). Use a **separate bot per environment** — the widget allows one `/setdomain` per bot.
   - `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
   - `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL` (R2 now, any S3-compatible store later)
   - `ADMIN_ALLOWLIST` (optional: emails permitted to self-provision as admin on first login)
   - No `NEXT_PUBLIC_*` var may hold anything environment-specific — Heroku pipeline promotion reuses the compiled slug, so build-time values would leak from staging into production.
7. ~~Set up Cloudflare Pages deployment~~ → **Heroku pipeline `wau`** (`wau-staging` → `wau`), EU region, Basic dyno (*as built*). Deploy layer is `Procfile`.
8. Add a **keep-warm ping** (Cloudflare Worker cron or GitHub Action) hitting a health endpoint every few days so a free/idle database doesn't suspend.

---

## 4. Auth & identity model

- **Identity lives entirely in your own Postgres** (no provider-managed tables). An app-layer auth library (Auth.js / NextAuth v5, or better-auth) manages credentials and sessions in *your* database, so nothing here is tied to a specific host.
- Identity tables you own: **`users`** (the person) + **`identities`** (one row per linked auth provider), plus a separate **`admins`** table:
  - **Parents & volunteers** authenticate with the **Telegram Login Widget**. A server route verifies the `hash` using `TELEGRAM_BOT_TOKEN`, looks up `identities (provider='telegram', provider_user_id=<telegram id>)` — creating the `users` + `identities` rows on first login — and issues a session. No password. Adding Google/Facebook later = a new `provider` value, no schema change.
  - **Admins** authenticate with **email/password** (credentials provider). First login is gated by `ADMIN_ALLOWLIST`; creates an `admins` row. The admin area is unlinked/hidden and requires an `admins` row.
  - The auth library may keep its own internal session tables; the domain doesn't reference them — each request is resolved to a `users` row (via its identity) or an `admins` row, and the domain uses those ids. This keeps the schema independent of the auth library.
- **Users vs admins, kept separate for now** (different populations): `users` = Telegram parents/volunteers (data subjects); `admins` = email/password operators. Admins never appear as `parent_id`/`volunteer_id` FKs. Trade-off: one account can't be both an admin and a Telegram parent — use separate logins (fine here). *Optional simplification now available: since `identities` abstracts the auth method, an admin's email/password could instead be a `'password'` identity on a `users` row with an `admin` role — collapsing `admins` into `users` and making `audit_log.actor_id` a single clean FK. Not done yet.*
- A single person can be both a parent and a volunteer; within `users`, `role` is a capability set (`{parent}`, `{volunteer}`, or both), not a hard identity split.
- **Authorization is enforced in the server layer** (Next.js server actions / route handlers) against the session's user id + role via the ORM — not provider RLS. Optional later hardening: Postgres RLS driven by a per-transaction `SET LOCAL app.current_user_id`, portable to any Postgres host.
- **No volunteer approval at this stage.** Any user logged in with Telegram can act as a volunteer (browse approved children, claim). Revisit later by adding a `volunteer_status` field and gating the browse/claim checks on it. Meanwhile the `audit_log` (who viewed/claimed what) is the main compensating control.

---

## 5. Roles & permissions

| Capability | Public (no auth) | Parent | Volunteer | Admin |
|---|---|---|---|---|
| View landing / info pages | ✅ | ✅ | ✅ | ✅ |
| Submit application(s) for own child(ren) | — | ✅ | — | ✅ |
| View own applications (any status) | — | ✅ | — | ✅ |
| Edit own application — **only while `draft`/`submitted`; locked once admin-approved** | — | ✅ | — | ✅ |
| Upload gift-confirmation for own application | — | ✅ | — | ✅ |
| Leave review | — | ✅ | — | ✅ |
| Look up own assigned volunteer's Telegram | — | ✅ | — | ✅ |
| Browse approved, unclaimed children | — | — | ✅ | ✅ |
| Claim a child | — | — | ✅ | ✅ |
| View own claimed children (with Telegram) | — | — | ✅ | ✅ |
| Approve/reject applications | — | — | — | ✅ |
| Edit any application (operational override; content fields only) | — | — | — | ✅ |
| **Assign a volunteer to an application by hand and mark it claimed** | — | — | — | ✅ |
| Release / reassign any claim | — | — | — | ✅ |
| Create campaigns; set type; activate / archive; open/close intake; global kill switch | — | — | — | ✅ |
| Global "disable all applications" switch | — | — | — | ✅ |
| Manage/export all data | — | — | — | ✅ |

Landing and info pages (`/`, `/parent`, `/volunteer`) render for **anonymous visitors with no login**. Auth (Telegram login) is triggered only when an anonymous visitor tries to *act* — start an application, browse/claim children, leave a review, etc. This matches the site map in §8.

Enforce authorization in the **server layer** (Next.js server actions / route handlers) via the ORM, against the session's user id + role. Never rely on client-side checks alone. Optional defense-in-depth: Postgres RLS via a per-transaction `SET LOCAL app.current_user_id` (portable across hosts).

Note: the **Admin** column's ✅ on parent/volunteer rows means *operational override via the admin panel* (managing others' data), not that admins are data subjects. Admins live in the separate `admins` table (§7), never in `users`, and have no `identities` row. Admin checks = `EXISTS (SELECT 1 FROM admins WHERE id = <session user id>)`.

---

## 6. Campaign model

- **Campaign types are hardcoded** (each type = a specific hardcoded form component): e.g. `saint_nicholas_day`, `new_school_year`, … Add new types in code.
  - **Only `saint_nicholas_day` is offered today** (Vital, Phase 8) — it is the one campaign we run and the only one with a form. The enum keeps every type that has ever existed, because historical campaigns still hold those values; a separate `CREATABLE_CAMPAIGN_TYPES` is what the admin form offers and the create schema accepts. Retiring a type is therefore not a migration: "we no longer offer this" and "this never existed" are different claims.
- A **base field set** is required for every campaign type (see §7). Each type adds/removes a few type-specific fields.
- **Admin controls at runtime**, not in code:
  - Which campaign is **active** and its **type** (via campaign `status`).
  - Whether the active campaign is **accepting new applications** (`accepting_applications`) — lets a campaign stay live (volunteers claiming, families confirming) while **new** parent submissions are closed. A normal phase, not an emergency.
  - A **global kill switch** — a master/emergency override that stops all intake instantly without touching the campaign.
- **Intake gate for parents:** a parent can start a *new* application only when there is an `active` campaign **AND** `accepting_applications = true` **AND** the global switch is on. When intake is closed, everything else still works — parents can view existing applications, look up their volunteer, confirm receipt, and leave reviews; volunteers keep browsing and claiming. Only "Start application" is gated.
- Volunteers only ever see applications with status `approved` (and by default `unclaimed`).
- **Archiving is derived, not stored.** A new year = a new `campaigns` row (fresh, zero applications). An application is "archived" simply because its campaign is no longer `active`. Profiles persist across years; applications rotate per campaign. All parent/volunteer queries are scoped to the active campaign, so users never see prior-year applications; admins can still select any past campaign. (Retention of archived PII is governed by §11/§12 — hidden ≠ kept forever.)

```
campaigns
  id            uuid pk
  type          text        -- enum-like, must match a hardcoded form: 'new_school_year' | 'christmas' | ...
  title         text        -- display title, e.g. «Новий навчальний рік 2026»
  description   text
  status        text        -- 'draft' | 'active' | 'archived'  (at most one 'active' at a time — enforce via partial unique index)
  accepting_applications boolean default true   -- intake gate for the active campaign; false = live but closed to NEW applications
  starts_at     timestamptz null
  ends_at       timestamptz null
  archived_at   timestamptz null
  created_at    timestamptz default now()
```

A single-row `settings` table holds the **global applications-enabled** switch (the emergency kill switch — orthogonal to campaign `status`).

---

## 7. Data model

> **Identity tables are your own** (in your Postgres, portable): `users` (the person) + `identities` (one row per linked auth provider — Telegram now, Google/Facebook later), and a separate `admins` (email/password operators). No shared supertype across `users`/`admins`, since nothing but `audit_log` ever needs to reference both. `audit_log` uses a **loose polymorphic reference** (`actor_id` + `actor_type` `'user'|'admin'`, no FK) plus a snapshot label — appropriate for an append-only log that must outlive deleted actors. The auth library keeps its own session tables; the domain maps each request to a `users`/`admins` row and never references the library's tables.

Status lifecycle for an application:
`draft → submitted → approved → claimed → fulfilled` (plus `rejected`). One child = one application.

**Edit lock:** a parent may edit an application only while its status is `draft` or `submitted`. Admin approval (→ `approved`) locks it for the parent; from then on only an admin can change it. Enforce this in the server-layer authorization (parent `UPDATE` allowed only when `status IN ('draft','submitted')`) as well as in the UI.

```
users                                 -- the person: Telegram parents/volunteers (data subjects)
  id               uuid pk default gen_random_uuid()
  role             text[]            -- {'parent'}, {'volunteer'} (combinable; NO 'admin' here)
  username         text              -- denormalized handle for display + the volunteer filter (synced from the telegram identity on login; provider-specific raw handles live in identities.data)
  phone            text null
  note             text null         -- OPTIONAL free-text note from the person (parent or volunteer); one per user
  created_at       timestamptz default now()

identities                            -- linked auth methods; one row per provider (extensible: Telegram now, Google/Facebook later)
  id               uuid pk default gen_random_uuid()
  user_id          uuid fk -> users on delete cascade
  provider         text              -- 'telegram'  (| 'google' | 'facebook' | ... in future)
  provider_user_id text              -- the provider's stable id (Telegram numeric user id, Google 'sub', …)
  data             jsonb null        -- verified provider payload (telegram: username, first_name, photo_url, auth_date)
  created_at       timestamptz default now()
  unique (provider, provider_user_id)   -- a given provider account links to exactly one user


admins                                -- email/password operators (not data subjects)
  id               uuid pk default gen_random_uuid()
  email            text not null unique
  password_hash    text              -- if the credentials library stores here; otherwise held by the auth library
  display_name     text
  created_at       timestamptz default now()
  -- membership in this table == admin privilege. Admin check = EXISTS (select 1 from admins where id = <session user id>)

applications
  id            uuid pk
  campaign_id   uuid fk -> campaigns
  parent_id     uuid fk -> users
  -- Common required fields (every campaign). Nullable in DB so drafts can be saved partially;
  -- "required" is enforced at SUBMIT via zod/server validation, not by NOT NULL.
  parent_name          text
  child_name           text
  child_age            int
  home_town            text          -- original hometown
  home_region          text          -- native / original region
  current_town         text          -- where the family lives now (displaced)  [sensitive]
  current_region       text          -- current region — PRIMARY volunteer location filter
  family_story         text
  gift_description     text          -- shown on the volunteer browse card
  gift_price           numeric(10,2) -- assume UAH (single currency); add gift_currency later if ever needed; shown on card
  delivery_information text          -- address / Nova Poshta etc. [sensitive: revealed only to the claiming volunteer]
  -- Campaign-type-specific extras (vary per hardcoded form)
  type_fields   jsonb
  status        text              -- 'draft'|'submitted'|'approved'|'rejected'|'claimed'|'fulfilled'
  rejection_note text null        -- admin note when rejected
  created_at    timestamptz default now()
  updated_at    timestamptz

application_files
  id             uuid pk
  application_id uuid fk -> applications
  kind           text            -- 'attachment' (with the application) | 'confirmation' (proof of receipt)
  storage_key    text            -- S3/R2 object key
  content_type   text
  size_bytes     bigint
  created_at     timestamptz default now()

claims
  id             uuid pk
  application_id uuid fk -> applications unique   -- one active claim per application
  volunteer_id   uuid fk -> users
  claimed_at     timestamptz default now()
  released_at    timestamptz null                -- if a volunteer un-claims

reviews
  id             uuid pk
  parent_id      uuid fk -> users
  application_id uuid fk -> applications null
  volunteer_id   uuid fk -> users null
  rating         int null
  body           text
  is_published   boolean default false           -- admin moderates before showing publicly
  created_at     timestamptz default now()

audit_log        -- who viewed/claimed/exported child data, for safety
  id           uuid pk
  actor_id     uuid                    -- polymorphic: users.id or admins.id (no FK — audit rows outlive deleted actors)
  actor_type   text                    -- discriminator: 'user' | 'admin' (which table actor_id lives in)
  actor_label  text                    -- snapshot at write time (@username / admin email) so the record stays readable if the actor is later deleted
  action       text
  target_type  text
  target_id    uuid
  created_at   timestamptz default now()
```

**Enum columns — use readable text, not integers.** Represent enum-like columns (`applications.status`, `campaigns.status`, `campaigns.type`, `application_files.kind`, `audit_log.actor_type`) as `text` with a `CHECK (col IN (...))` constraint — or a native `pgEnum` via the ORM — mapped to a TypeScript string-literal union / `const` object in one place. This keeps DB values self-documenting (`status = 'approved'`, not `3`), portable across any Postgres host, and easy to debug for a volunteer team. Avoid Rails-style integer-backed enums here: they make raw DB values opaque and make reordering the code mapping silently reassign meaning to stored rows. The "named-constant" ergonomics you'd want from Rails enums come from the app-layer TS union, not from integer storage — so you keep that DX with none of the downsides. `users.role` stays a `text[]` (array of `'parent'`/`'volunteer'`). Reach for integers only for a genuine hot-path storage/index need — not applicable at this scale.

**Common required fields (every campaign)** are the promoted columns above: `parent_name`, `child_name`, `child_age`, `home_town`, `home_region`, `current_town`, `current_region`, `family_story`, `gift_description`, `gift_price`, `delivery_information`. Plus (not stored as free fields): parent Telegram (from auth), a **consent checkbox** (data processing), and — if kept — a **required attachment** (e.g. a document confirming displaced status; decide carefully, see §11). All are optional at `draft` stage and enforced as required on **submit** via shared zod schemas.

**Type-specific fields** — e.g. New School Year: grade, clothing/shoe sizes, needed supplies checklist; Christmas: wish text, age-appropriate gift category select. These live in the hardcoded per-type form + `type_fields` JSON.

---

## 8. Site map / routes

```
/                         Landing: mission, photos, contacts, how it works        [public]
/parent                   Info for parents + entry points                         [public]
  /parent/apply           Multistep application form + Turnstile                  [parent auth]
  /parent/applications    My applications & their status                          [parent auth]
  /parent/applications/:id/confirm   Upload proof of receipt                      [parent auth]
  /parent/review          Leave a review                                          [parent auth]
  /parent/my-volunteer    Look up the volunteer who claimed my child (Telegram)   [parent auth]
/volunteer                Info for volunteers + entry point                       [public]
  /volunteer/children     Browsable list + filters (Telegram, availability, age, current region)  [volunteer auth]
  /volunteer/claims       My claimed children (with Telegram to coordinate)       [volunteer auth]
/auth/telegram            Telegram login callback / verification                  [system]
/admin                    Hidden. Login (email/password).                         [admin]
  /admin/campaigns        Create, set type, activate/archive, browse past; kill switch  [admin]
  /admin/applications     Moderation queue: approve/reject, view all data         [admin]
  /admin/reviews          Moderate reviews                                        [admin]
  /admin/export           CSV/JSON export                                         [admin]
robots.txt (allow /), sitemap.xml (landing page only)                             [system]
/api/health               Keep-warm ping target (prevents idle DB suspend)        [system]
```

---

## 9. Phased build plan (the Claude Code task list)

**Phase 0 — Infra & scaffold**
- Complete §3 checklist. Scaffold Next.js + TS + Tailwind. Add i18n (`uk` default). Add ESLint/Prettier. Base layout + responsive shell + design tokens. Deploy a "hello" build to the host (*as built:* Heroku — see §2).

**Phase 1 — Data layer**
- ORM (Drizzle) schema + migrations for all tables in §7, run against `DATABASE_URL`. Implement the §5 permission matrix as reusable server-layer authorization checks. Seed one draft campaign. Set up a typed DB client + zod schemas shared between client and server.

**Phase 2 — Public site + crawler blocking**
- Landing, /parent, /volunteer info pages (content-driven, editable copy). Implement §10 crawler blocking. Contact section.

**Phase 3 — Auth**
- Set up the auth library (Auth.js / better-auth) storing its sessions in Postgres. Telegram Login Widget + server-side hash verification → find-or-create `users` + `identities (provider='telegram')` → issue session. Admin email/password (credentials provider, gated by `ADMIN_ALLOWLIST`) → `admins` row. Route guards + reusable `getSessionActor()` / `requireAdmin()` helpers (returning the `users`/`admins` row + kind) used by all server actions.

**Phase 4 — Parent flow**
- Multistep application form per campaign type (hardcoded forms, shared base fields), inline validation, required-field enforcement, file upload to R2, and Turnstile verification on submit. "My applications" list with statuses. Enforce one-application-per-child; allow a parent to file multiple applications (one per child). Allow parents to edit an application only while `draft`/`submitted`; lock it on admin approval (enforced in both server-layer authorization and UI).

**Phase 5 — Admin flow**
- Campaign management (create, set type, `status` lifecycle draft→active→archived, **open/close new-application intake** (`accepting_applications`), browse past campaigns, global kill switch). Scope all parent/volunteer queries to the active campaign so prior-year applications are hidden from users. Gate the parent "Start application" action on active + accepting + global-switch. Application moderation queue (approve/reject with note, view all fields + files). Admin edit of any application (content fields only — never status/campaign/parent). Review moderation. Data export. Note: manual volunteer assignment is an admin capability but lands in **Phase 6**, since it writes `claims`.

**Phase 6 — Volunteer flow**
- Approved-children list with filters: availability (claimed/unclaimed), age band, and the region the family **left** (`home_region`) — volunteers look for families from a place they have a tie to. (An earlier draft also listed "Telegram data" as a filter; nobody could say what it would filter on, so it is dropped.) Cards show non-sensitive fields incl. `gift_description` + `gift_price` and **`family_story`** (Vital, Phase 6 — a volunteer chooses on the family's own account of what happened, and the parent form already promises it is read by the wizard who will be choosing); `current_town`, `delivery_information`, `parent_name`, and parent Telegram are revealed only to the volunteer who claims. Claim action (atomic — prevent double-claim via a unique constraint + transaction). "My claims" view exposing the claimed families' delivery info + Telegram for coordination. Optional un-claim/release.
- **Manual assignment by an admin** (Vital, during Phase 5 review). Plenty of matches happen off-platform — a volunteer messages the coordinator directly, or an organisation takes ten children at once — and the coordinator then needs the system to reflect reality rather than the reverse. So: an admin can pick a volunteer for an approved application, which creates the claim and moves the application to `claimed`, and can release or reassign any existing claim.
  - It must go through the **same** claim path as a self-claim: one transaction, the `claims` unique index on `application_id`, and reassignment releases the incumbent rather than inserting a second row. No second write path to a table whose whole point is that double-claiming is impossible.
  - Audit-logged **distinctly** from a self-claim (`claim.assigned_by_admin` / `claim.released_by_admin`), because "who decided this volunteer gets this child" is exactly the question an audit trail exists to answer.
  - Assigning a volunteer reveals that family's `current_town`, `delivery_information`, `parent_name` and contact to them (tier 2 of the child-data invariant). An admin doing it by hand is taking that decision on the family's behalf, so the UI must say so.
  - **Volunteers must have signed in at least once** (Vital, resolved). An admin assigns only from *existing* `users` rows — there is no placeholder or "offline volunteer". `claims.volunteer_id` stays a real FK, one human is one identity, and the contact stays fresh because `users.username` re-syncs from Telegram on every login rather than being a string an admin typed once. Operationally this costs one tap: these volunteers are already in Telegram, Telegram *is* the login, so the coordinator pastes a login link into the conversation they are already having. Rejected alternative: an admin-created placeholder, which reintroduces the stale-contact problem Phase 4 deliberately designed out and needs a duplicate-merge path the first time that person logs in for real.
  - **Resolved before building** (Vital, Phase 6 kickoff):
    - **The volunteer role is self-serve.** A signed-in user opts in on `/volunteer` — nothing grants it today, and `canBrowseChildren` requires it, which is the same circular-role trap `canStartApplication` hit in Phase 4. Matches §11's "no approval gate at this stage" plus the compensating controls already built (redacted browse cards, audit log).
    - **Claiming is blocked until the volunteer has a usable contact** — the same gate parents hit at submit. A volunteer with no `@username` and no phone is someone the family cannot reach, so no child is ever claimed by an unreachable person. Applies to admin assignment too.
    - **No self-release.** A volunteer who cannot follow through contacts the coordinator, who releases the claim in the admin UI. Slower than a self-service button, but a human sees every drop-out instead of children quietly returning to the pool.
    - **The browse list shows claimed children too**, marked as claimed — volunteers can see how the campaign is going, and it is still only browse-card fields.
  - Consequences for the build: the assignment UI needs a way to **find** a volunteer (search `users` by `@username`), and manual assignment must apply the **same contactability gate as a self-claim** — a volunteer with no `@username` and no phone is someone the family cannot reach, and an admin assigning by hand must not be able to bypass that. `canClaim` currently checks role + status + not-already-claimed; the contact check is missing there and needs adding for both paths.

**Phase 7 — Fulfilment loop**
- Parent uploads gift-confirmation (photo/video) → application status → `fulfilled`. "Look up my volunteer" for parents. Reviews publishing.

**Phase 8 — Hardening**
- Rate limiting on public endpoints (form submit, login). Server-side validation everywhere. `audit_log` writes on view/claim/export of child data. Automated Postgres backups (provider snapshots or a scheduled `pg_dump`). Basic uptime + error monitoring. Accessibility pass. Load-test the volunteer list with filters.

---

## 10. Indexing & crawler policy

**Policy:** the landing page (`/`) is indexable so the project is discoverable; every other route is `noindex`. Data-bearing routes are behind auth + server-layer authorization regardless.

- **Default noindex, override the landing page.** Set `robots: { index: false, follow: false }` in the root layout metadata (`app/layout.tsx`), then override with `index: true, follow: true` on the landing page only (`app/page.tsx`).
- **robots.txt (`app/robots.ts`):** `Allow: /` and reference the sitemap. Do **not** `Disallow` the noindex routes — a disallowed URL can't be crawled, so Google never sees the `noindex` and may still list the bare URL. Let auth + `noindex` handle exclusion.
- **sitemap (`app/sitemap.ts`):** list only `/` (plus any other genuinely public page you deliberately want indexed).
- **No blanket header.** If setting `X-Robots-Tag: noindex` via middleware, exclude `/` so the landing page stays indexable.
- **Cloudflare:** ensure Bot Fight Mode / WAF isn't challenging verified search crawlers on `/`. Verify with Google Search Console URL inspection after launch; disable Bot Fight Mode if it interferes and rely on auth + `noindex` for protection.
- **Privacy caveat (important):** indexed = cached, image-searchable, hard to remove. The landing page must not identify any specific child — no real names, faces, locations, or individual stories. Use consented, non-identifying, or illustrative imagery only.
- **Not a security boundary.** Crawler policy is hygiene; every data-bearing route stays behind auth + server-layer authorization.

---

## 11. Privacy, safety & data protection (do not skip)

- **Data minimization.** Store only what's needed to fulfill a wish. Reconsider requiring documents that reveal a child's exact identity/location; if required for verification, restrict them to admin view only and never expose to volunteers.
- **Least exposure to volunteers.** A volunteer should see the wish and the minimum needed to fulfill it — not a child's full document set. Reveal the parent's Telegram only after a claim.
- **Volunteer access.** No approval gate at this stage — any Telegram-logged-in user can browse approved children and claim. Compensating controls: the browse card shows only non-sensitive fields (first name, age, current region, gift description/price, family story); `current_town`, `delivery_information`, `parent_name`, and the family's Telegram are revealed only *after* a claim, to the claiming volunteer; and every view/claim is logged in `audit_log`. Reintroduce an approval gate if abuse appears.
- **Consent.** Explicit consent checkbox for data processing on the parent form; store timestamp/version of the consent text.
- **Legal.** Ukrainian personal-data law + (if any EU data subjects) GDPR apply. Provide a privacy policy, a data-retention window, and a deletion path. Get sign-off from someone accountable for the org.
- **Media.** Confirmation photos/videos of children are especially sensitive — private buckets, signed URLs, short-lived access, no public listing.
- **Abuse reporting.** Give parents a way to report a volunteer; give admin a way to ban.

---

## 12. Non-functional requirements

- **i18n:** all copy in `uk` locale files; structure so a second language could be added later.
- **Validation:** shared zod schemas, server-authoritative.
- **File limits:** cap size/type; if allowing video, transcode/compress or cap length. Store media on R2 (10 GB free, zero egress) via the S3 API.
- **Rate limiting** on submit/login/claim.
- **Backups:** enable provider backups/snapshots or a scheduled `pg_dump` once live; keep an export routine.
- **Monitoring:** health endpoint + error tracking (e.g. Sentry free tier).
- **Accessibility:** semantic HTML, labels, keyboard nav, contrast.

---

## 13. Driving this with Claude Code — suggested sequence

Feed Claude Code this file, then work phase by phase with prompts like:
1. "Read `wizards-among-us-build-plan.md`. Scaffold Phase 0 exactly as specified. List every env var you need from me."
2. "Implement Phase 1: Drizzle schema + migrations for all §7 tables, and server-layer authorization helpers matching §5. Show the migration SQL before applying."
3. "Implement Phase 3 auth: Telegram Login Widget with server-side hash verification, plus admin email/password. Explain the verification step."
4. …continue per phase. After each phase, ask it to write tests and a short README section.

Keep each phase in its own branch/PR so volunteers can review changes.

---

## 14. Open decisions (confirm before Phase 1)

1. ~~**Deployment budget**~~ — **resolved:** Heroku Basic dyno (~$7/mo, no idle sleep) + Neon free tier ≈ **$7/mo per environment**. Still open: whether to pay for a Neon plan with automated backups before going live with real family data — recommended.
2. **Confirmations:** photos only, or video too? (Drives storage choice and limits.)
2a. ~~**Contacting users without a Telegram `@username`**~~ — **resolved (Phase 4):** a Telegram username is optional, so some users have no clickable handle; only their numeric id is stored, which is usable by our bot, not by a human volunteer. Decision: **never block sign-in on it**; require a usable contact at **application submit / claim** instead (use the `@username` when present, otherwise the person sets one or supplies an alternative). The contact field is **sensitive** — claiming-volunteer only, never on the browse card. A later alternative is bot-mediated introductions by Telegram id (Phase 7), which would remove the need to exchange handles at all.
3. ~~**Required verification document**~~ — **resolved from the real 2025 form** (`docs/reference/st-nicholas-2025-google-form.pdf`): one photo of the child's **довідка ВПО**, required at submit. **Admins only — never shown to a volunteer** (file kind `idp_certificate`). Retention still open (see item 8).
4. **Volunteers:** self-register with Telegram, no approval gate at launch (decided). Revisit adding vetting if abuse appears.
5. **Multiple active campaigns at once**, or exactly one at a time? (One-at-a-time keeps the active-campaign scoping — and thus the archive behavior — simplest; the schema enforces it via a partial unique index on `status = 'active'`.)
6. ~~**Exact base field set**~~ — **resolved from the real 2025 form**: the existing base fields plus `submitted_at` and `social_media_consent`; `campaigns.gift_price_cap` carries the per-campaign budget ceiling (2025: 700 UAH). Contact lives on **`users`** (`username` synced from Telegram, `phone` as fallback), not per application. The shop link is a **campaign type field** in `type_fields`, not a base column. The required consent is not stored — it gates submit, so `submitted_at` implies it. Age band is **derived** from `child_age`, not asked twice. Three uploads: `idp_certificate`, `letter_photo`, `child_with_letter_photo`. Remaining: the `new_school_year` type fields (first campaign is St Nicholas).
7. **Region taxonomy** — free text vs a fixed oblast/city list (affects filtering quality).
8. **Data retention** window and deletion policy.

---

## Appendix A — App flow & features (for designers)

*A plain-language walkthrough of what the product does, who uses it, and every screen and state to design. Self-contained — shareable on its own. Where it says "see §N," that refers to the engineering sections above and isn't needed for design work.*

### A.1 What we're building

A Ukrainian web app that connects two groups: **parents** of children displaced by the war, who submit a wish for their child during a seasonal campaign (e.g. New School Year, Christmas), and **volunteers**, who browse those children, "claim" one, buy/deliver the gift, and coordinate with the family over Telegram. An **admin** runs the whole thing behind the scenes. All copy is in **Ukrainian**. It's used heavily on **phones**, so design mobile-first and make it fully responsive up to desktop.

### A.2 Who uses it (three roles)

- **Parent** — a displaced caregiver, often on a phone, signing in with **Telegram** (no password). Submits one application per child, tracks its status, later uploads proof the gift arrived, and can leave a thank-you. Emotional state: stressed, hopeful — the experience must feel calm, warm, dignified, and trustworthy, never bureaucratic or pity-driven.
- **Volunteer** — someone who wants to help, also signs in with **Telegram**. Browses available children, filters to find one they can help, claims them, and gets the family's Telegram to coordinate. Experience should make it easy to choose and feel good about helping, without gamifying children.
- **Admin** — an internal operator, signs in with **email + password** on a hidden URL. Approves applications, manages the active campaign, and views/exports data. **Low design priority** — a clean, functional dashboard is enough; no marketing polish needed.

### A.3 Design principles & constraints

- **Ukrainian, mobile-first, responsive.** Phones are the primary device; scale gracefully to desktop.
- **Telegram sign-in** for parents and volunteers — design the "Sign in with Telegram" entry point and the logged-in/logged-out states. No email/password screens for these two roles.
- **Sensitive subject.** Displaced children in wartime. Tone: warm, calm, respectful, hopeful. Avoid distressing imagery, pity framing, or anything that sensationalizes the children.
- **Privacy is visible in the design.** Never show a child's identifying details publicly. Public pages must not reveal individual children (see A.8). Inside the app, show volunteers only what they need to fulfill a wish.
- **Only the landing page is public.** Everything else sits behind Telegram login. The landing page is the single "front door" for trust, story, and contact.
- **Accessibility** — strong contrast, clear labels, large tap targets, keyboard-navigable forms.

### A.4 Screen inventory

**Public (no login)**
- Landing page — mission, how it works, photos (non-identifying), contacts, and two clear entry points: "I'm a parent" / "I'm a volunteer."
- Parent info page — explains what parents get and how it works, with a "Start application" call to action.
- Volunteer info page — explains how helping works, with a "Browse children" call to action.

**Parent (after Telegram login)**
- Multistep application form (with captcha) — the core parent screen.
- My applications — list of this parent's applications with clear status.
- Confirm receipt — upload a photo/video proving a specific child got the gift.
- Look up my volunteer — see the volunteer's Telegram once their child is claimed.
- Leave a review — a thank-you / feedback message.

**Volunteer (after Telegram login)**
- Children list — browsable cards with filters.
- My claims — children this volunteer has claimed, with the family's Telegram to coordinate.

**Admin (hidden, utilitarian)**
- Login, dashboard, campaign management, application moderation queue, review moderation, data export.

### A.5 Parent journey (primary flow)

1. Lands on the site → taps **"I'm a parent."**
2. Reads the short info page → taps **"Start application"** → prompted to **sign in with Telegram**.
3. Fills a **multistep form** for one child. Common fields (every campaign): parent name; child name and age; **where the family is from** (hometown + native region); **where they live now** (current town + region); the family's story; the **gift** they're hoping for (description + approximate price); and **delivery information** (how/where to send it). Plus campaign-specific wishes (vary by campaign — see A.7), any required attachment, a consent checkbox, and a **captcha** before submitting. Group these into logical steps (e.g. About the family → Location → Their story → The gift → Delivery → Review & submit).
4. Submits → sees a friendly **"submitted, pending review"** confirmation and lands on **My applications**.
5. While pending, the parent can **edit** the application. Once an admin **approves** it, it locks (no more edits).
6. A **volunteer claims** the child → the parent can use **"Look up my volunteer"** to see the volunteer's Telegram and coordinate.
7. After the gift arrives, the parent opens **Confirm receipt** for that application and uploads a **photo/video** → the application shows as **fulfilled**.
8. Optionally, the parent **leaves a review**.
- A parent with **multiple children** repeats the form once per child (one child = one application).

### A.6 Volunteer journey (primary flow)

1. Lands → taps **"I'm a volunteer"** → reads the info page → **signs in with Telegram**.
2. Sees the **Children list**: cards of children who are approved and still available.
3. Uses **filters** to narrow down: age, current region (where the family lives now), availability (available / claimed), and Telegram data.
4. Opens a card, decides to help → **claims** the child.
5. Goes to **My claims** to see the **family's Telegram** and coordinate the gift.
6. Delivers the gift; the parent later confirms receipt (closes the loop).

### A.7 Campaigns (affects the parent form)

- The app runs one **campaign** at a time, of a **type** (New School Year, Christmas, …). The form's fields differ a bit per type, but share a common base (parent & child, both locations, family story, gift + price, delivery info, consent, attachment).
- Only the **active** campaign is visible; previous years' applications are automatically hidden from parents and volunteers (they don't design an "archive" — old data simply isn't shown). A returning family starts a fresh application next year.
- Admin can **close new-application intake while the campaign stays live** (volunteers keep claiming, families keep confirming — only "Start application" is disabled), **pause everything** (kill switch), or have **no active campaign**. Design a clear "not accepting new applications right now" state on the parent entry point for these cases — and note that a parent who already has applications can still view them, look up their volunteer, confirm receipt, and leave a review even when new intake is closed.

### A.8 Content & imagery guidance

- **Landing/public pages:** use warm, non-identifying, or illustrative imagery. **No real names, faces, locations, or personal stories tied to an individual child** on public pages (they're publicly searchable).
- Include trust signals: a clear "about/mission," "how it works," and real **contacts**.
- All copy in **Ukrainian**; keep it plain and reassuring.

### A.9 Components & patterns to design

- "Sign in with Telegram" button + logged-in state (avatar/username, sign out).
- **Multistep form wizard**: progress indicator, step navigation, inline validation, required-field markers, field types (text inputs, checkboxes, select/dropdowns), **file upload** with preview and size/type feedback, and a **captcha** step.
- **Child card** (volunteer list): privacy-minimized — child's **first name, age, current region, and the gift (description + approximate price)**, plus an availability badge and a "Claim" action. **Do not** show last name, current town, delivery information, family contact, or an identifying photo — those appear only after claiming, on **My claims**.
- **Filter bar** for the children list (age, current region, availability, Telegram).
- **Status indicators** for parents: submitted / pending / approved / claimed / fulfilled / rejected (with a friendly explanation of each).
- **Upload with progress + preview** for the confirmation photo/video.
- **Optional note field** — a free-text "anything else you'd like us to know?" for parents and volunteers, saved to their profile (one per person, not per application). Optional, never on the public card.
- **Admin dashboard** (utilitarian): tables, approve/reject actions, campaign controls, export button.

### A.10 States & edge cases to cover

- **Applications closed** (kill switch on or no active campaign) — parents see a clear "closed for now, check back" message instead of the form.
- **Empty lists** — volunteer sees "no children available right now"; parent sees "no applications yet."
- **Already claimed** — a child taken by someone else while browsing.
- **Form validation errors** and **upload errors/in-progress**.
- **Locked application** — after admin approval, the parent sees a read-only view (no edit).
- **Loading** and **success** confirmations throughout.

### A.11 Out of scope / low priority for design

- The **admin panel** can be purely functional (unstyled or lightly styled) — focus design energy on the public, parent, and volunteer screens.
- A single-page-app feel is nice-to-have, not required.
- Design is optional to the build: if no visual design is provided, engineering will use a clean, accessible default. Anything the designer does provide will improve the parent and volunteer experience most.
