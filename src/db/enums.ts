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

// Every type that HAS EVER existed. This stays wide because the column and its
// CHECK constraint still hold historical rows: narrowing it would type an
// existing `new_school_year` campaign as something it is not, and break every
// screen that renders one.
export const CAMPAIGN_TYPES = [
  "new_school_year",
  "saint_nicholas_day",
] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// What an admin may CREATE today (Vital, Phase 8). «Святий Миколай» is the only
// campaign we run and the only one with a form behind it, so it is the only one
// offered — but past campaigns of another type keep working, and adding a type
// back is a value here plus a form component.
//
// Deliberately a separate list rather than a narrowed enum: "we no longer offer
// this" and "this never existed" are different claims, and only the first one
// is true.
export const CREATABLE_CAMPAIGN_TYPES = ["saint_nicholas_day"] as const;
export type CreatableCampaignType = (typeof CREATABLE_CAMPAIGN_TYPES)[number];

export function isCreatableCampaignType(
  value: string,
): value is CreatableCampaignType {
  return (CREATABLE_CAMPAIGN_TYPES as readonly string[]).includes(value);
}

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

// Uploads attached to an application. Kinds differ in WHO MAY SEE THEM, so the
// kind is the authorization input — never widen a check to "any file".
//   idp_certificate        — довідка ВПО (child's displacement certificate).
//                            ADMIN ONLY. Never shown to a volunteer.
//   letter_photo           — photo of the child's letter to St Nicholas.
//   child_with_letter_photo— photo of the child holding the letter.
//                            Both: revealed only to the volunteer holding the
//                            active claim (decided with the St Nicholas 2025
//                            form — see CLAUDE.md child-data exposure).
//   confirmation           — parent's proof the gift arrived (Phase 7).
//   attachment             — generic spare kind for future campaign types.
export const FILE_KINDS = [
  "idp_certificate",
  "letter_photo",
  "child_with_letter_photo",
  "confirmation",
  "attachment",
] as const;
export type FileKind = (typeof FILE_KINDS)[number];

// How a family can be reached. The 2025 form asked for "номер телефону у
// формі +38xxxx або нік @", so exactly these two.
//
// APP-LEVEL ONLY — no column stores this. A Telegram handle already lives in
// users.username and a fallback number in users.phone, so the method is
// *derived* (see resolveUserContact); persisting it too would be a third copy
// that can drift.
export const CONTACT_METHODS = ["telegram", "phone"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

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

// Where a family can have been DISPLACED FROM: the occupied and front-line
// oblasts (Vital). Only this question is narrowed — «Область, де ви живете
// зараз» stays the full list, because a displaced family can end up anywhere.
//
// A subset, not a separate enum: home_region and current_region are the same
// column type and the same taxonomy, and one list of slugs stays the single
// source of truth. Ordering here is geographic-ish for reading; the <select>
// sorts by the Ukrainian label like every other region list.
export const DISPLACED_FROM_REGIONS = [
  "donetsk",
  "dnipropetrovsk",
  "zaporizhzhia",
  "luhansk",
  "mykolaiv",
  "sumy",
  "kharkiv",
  "kherson",
  "chernihiv",
  "kyiv",
  "crimea",
] as const satisfies readonly UkraineRegion[];

export type DisplacedFromRegion = (typeof DISPLACED_FROM_REGIONS)[number];

// Keys for the key-value `settings` table. Each is one row (value in a jsonb
// column). Add a new switch = add a key here + seed a row; no migration.
export const SETTING_KEYS = {
  // Global emergency kill switch for all new-application intake (boolean).
  applicationsEnabled: "applications_enabled",
} as const;
export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];
