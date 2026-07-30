// Single source of truth for every enum-like value in the schema.
//
// Convention (CLAUDE.md): enum columns are stored as readable `text` with a DB
// `CHECK` constraint, and mapped here to a TS string-literal union. DB values
// read as words (`'approved'`, not `3`). These arrays are consumed by both the
// Drizzle schema (column typing + CHECK constraints) and the shared zod schemas.

export const USER_ROLES = ["parent", "volunteer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const IDENTITY_PROVIDERS = ["telegram"] as const; // google/facebook later
export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];

export const CAMPAIGN_TYPES = [
  "new_school_year",
  "saint_nicholas_day",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const CAMPAIGN_STATUSES = ["draft", "active", "archived"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "claimed",
  "fulfilled",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const FILE_KINDS = ["attachment", "confirmation"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const ACTOR_TYPES = ["user", "admin"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

// Ukraine's administrative regions used for home_region / current_region and the
// volunteer location filter: 24 oblasts + the Autonomous Republic of Crimea.
// Stored as stable ASCII slugs; Ukrainian labels live in messages/uk.json
// (`regions.*`). Kyiv city / Sevastopol are intentionally not separate values —
// families in Kyiv city pick `kyiv` (the oblast).
export const UKRAINE_REGIONS = [
  "cherkasy",
  "chernihiv",
  "chernivtsi",
  "dnipropetrovsk",
  "donetsk",
  "ivano_frankivsk",
  "kharkiv",
  "kherson",
  "khmelnytskyi",
  "kirovohrad",
  "kyiv",
  "luhansk",
  "lviv",
  "mykolaiv",
  "odesa",
  "poltava",
  "rivne",
  "sumy",
  "ternopil",
  "vinnytsia",
  "volyn",
  "zakarpattia",
  "zaporizhzhia",
  "zhytomyr",
  "crimea",
] as const;
export type UkraineRegion = (typeof UKRAINE_REGIONS)[number];

// Keys for the key-value `settings` table. Each is one row (value in a jsonb
// column). Add a new switch = add a key here + seed a row; no migration.
export const SETTING_KEYS = {
  // Global emergency kill switch for all new-application intake (boolean).
  applicationsEnabled: "applications_enabled",
} as const;
export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
