import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ACTOR_TYPES,
  APPLICATION_STATUSES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  FILE_KINDS,
  IDENTITY_PROVIDERS,
  UKRAINE_REGIONS,
  USER_ROLES,
} from "./enums";

// Build a DB CHECK that constrains a column to a fixed set of readable values —
// the "text + CHECK" half of our enum convention (the TS union comes from
// ./enums). Values are our own ASCII constants, inlined as SQL literals.
function oneOf(column: string, values: readonly string[]) {
  const list = values.map((v) => `'${v}'`).join(", ");
  return sql.raw(`${column} in (${list})`);
}
// Same, but allows NULL — for columns that are required only at submit time
// (drafts save partial data), so NOT NULL can't be used.
function oneOfNullable(column: string, values: readonly string[]) {
  const list = values.map((v) => `'${v}'`).join(", ");
  return sql.raw(`${column} is null or ${column} in (${list})`);
}

// Convention: every table carries created_at + updated_at (except append-only
// audit_log). updated_at defaults to now() on insert and is bumped on every
// Drizzle update via $onUpdate (app-level, like ActiveRecord timestamps — a raw
// SQL UPDATE won't touch it; add a trigger if we ever need DB-guaranteed).
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// Identity: our own tables (portable). The auth library's session tables are
// added in Phase 3 and are NOT referenced by the domain.
// ---------------------------------------------------------------------------

// The person: Telegram parents/volunteers (data subjects). Never admins.
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Capability set, combinable: {'parent'}, {'volunteer'}, or both.
    role: text("role", { enum: USER_ROLES })
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    username: text("username"), // denormalized handle for display + volunteer filter
    phone: text("phone"),
    note: text("note"), // optional free-text note from the person (one per user)
    ...timestamps(),
  },
  (t) => [
    check(
      "users_role_valid",
      sql`${t.role} <@ ARRAY['parent','volunteer']::text[]`,
    ),
  ],
);

// Linked auth methods; one row per provider (Telegram now, Google/FB later).
export const identities = pgTable(
  "identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", { enum: IDENTITY_PROVIDERS }).notNull(),
    providerUserId: text("provider_user_id").notNull(), // provider's stable id
    data: jsonb("data"), // verified provider payload (telegram: username, photo_url, …)
    ...timestamps(),
  },
  (t) => [
    // A given provider account links to exactly one user.
    unique("identities_provider_uid_unique").on(t.provider, t.providerUserId),
    check("identities_provider_valid", oneOf("provider", IDENTITY_PROVIDERS)),
  ],
);

// Email/password operators (not data subjects). Membership == admin privilege.
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  displayName: text("display_name"),
  ...timestamps(),
});

// ---------------------------------------------------------------------------
// Campaigns + global settings
// ---------------------------------------------------------------------------

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type", { enum: CAMPAIGN_TYPES }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: CAMPAIGN_STATUSES })
      .notNull()
      .default("draft"),
    // Intake gate: campaign can stay live while new submissions are closed.
    acceptingApplications: boolean("accepting_applications")
      .notNull()
      .default(true),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    check("campaigns_type_valid", oneOf("type", CAMPAIGN_TYPES)),
    check("campaigns_status_valid", oneOf("status", CAMPAIGN_STATUSES)),
    // At most one 'active' campaign at a time (invariant) — needs a partial
    // index, so this stays a unique index rather than a unique constraint.
    uniqueIndex("campaigns_one_active")
      .on(t.status)
      .where(sql`${t.status} = 'active'`),
  ],
);

// Global settings as a key-value store: one row per switch (e.g.
// 'applications_enabled' → true, the emergency kill switch). New switches are
// new rows, no migration. Keys live in SETTING_KEYS (./enums).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  ...timestamps(),
});

// ---------------------------------------------------------------------------
// Applications + files
// ---------------------------------------------------------------------------

// Status lifecycle: draft → submitted → approved → claimed → fulfilled (+ rejected).
// Common fields are nullable in DB so drafts save partially; "required" is
// enforced at SUBMIT via zod (applicationSubmitSchema), not NOT NULL. Range
// rules (child age, etc.) live in zod too, not DB CHECKs.
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => users.id),
    parentName: text("parent_name"),
    childName: text("child_name"),
    childAge: integer("child_age"),
    homeTown: text("home_town"),
    homeRegion: text("home_region", { enum: UKRAINE_REGIONS }),
    currentTown: text("current_town"), // [sensitive] revealed only to the claiming volunteer
    currentRegion: text("current_region", { enum: UKRAINE_REGIONS }), // primary volunteer filter
    familyStory: text("family_story"),
    giftDescription: text("gift_description"), // shown on the browse card
    giftPrice: numeric("gift_price", { precision: 10, scale: 2 }), // UAH (single currency)
    deliveryInformation: text("delivery_information"), // [sensitive] claiming volunteer only
    typeFields: jsonb("type_fields"), // campaign-type-specific extras
    status: text("status", { enum: APPLICATION_STATUSES })
      .notNull()
      .default("draft"),
    rejectionNote: text("rejection_note"),
    ...timestamps(),
  },
  (t) => [
    check("applications_status_valid", oneOf("status", APPLICATION_STATUSES)),
    check(
      "applications_home_region_valid",
      oneOfNullable("home_region", UKRAINE_REGIONS),
    ),
    check(
      "applications_current_region_valid",
      oneOfNullable("current_region", UKRAINE_REGIONS),
    ),
    // Volunteer browse: approved + unclaimed within the active campaign.
    index("applications_campaign_status_idx").on(t.campaignId, t.status),
    index("applications_parent_idx").on(t.parentId),
  ],
);

export const applicationFiles = pgTable(
  "application_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: FILE_KINDS }).notNull(),
    storageKey: text("storage_key").notNull(), // S3/R2 object key
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    ...timestamps(),
  },
  (t) => [
    check("application_files_kind_valid", oneOf("kind", FILE_KINDS)),
    index("application_files_application_idx").on(t.applicationId),
  ],
);

// ---------------------------------------------------------------------------
// Claims + reviews
// ---------------------------------------------------------------------------

// Atomic claim: exactly one claim row per application (plain UNIQUE), so a
// double-claim is impossible. Releasing sets released_at on that row; a
// re-claim UPDATEs the same row (new volunteer_id, released_at back to NULL)
// rather than inserting. Combine with a transaction on claim.
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    volunteerId: uuid("volunteer_id")
      .notNull()
      .references(() => users.id),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [unique("claims_application_unique").on(t.applicationId)],
);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentId: uuid("parent_id")
    .notNull()
    .references(() => users.id),
  applicationId: uuid("application_id").references(() => applications.id),
  volunteerId: uuid("volunteer_id").references(() => users.id),
  rating: integer("rating"), // range (1–5) validated in zod, not a DB CHECK
  body: text("body"),
  isPublished: boolean("is_published").notNull().default(false), // admin-moderated
  ...timestamps(),
});

// ---------------------------------------------------------------------------
// Audit log — append-only. Loose polymorphic actor ref (no FK) + snapshot label,
// so rows stay readable after an actor is deleted. Immutable: created_at only.
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").notNull(), // users.id or admins.id — intentionally no FK
    actorType: text("actor_type", { enum: ACTOR_TYPES }).notNull(),
    actorLabel: text("actor_label").notNull(), // @username / admin email at write time
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check("audit_log_actor_type_valid", oneOf("actor_type", ACTOR_TYPES)),
    index("audit_log_target_idx").on(t.targetType, t.targetId),
  ],
);
