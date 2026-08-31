import { z } from "zod";

import type { CampaignType } from "@/db/enums";
import { userPhoneSchema } from "@/features/users/contact";
import { regionSchema } from "@/lib/enumSchemas";

// Base fields required for every campaign (§7), modelled on the real
// «Святий Миколай 2025» form (docs/reference/st-nicholas-2025-google-form.pdf).
// Enforced at SUBMIT — drafts save partial data (see applicationDraftSchema), so
// these are NOT NOT NULL in the DB. The server always re-validates; client-side
// use is inline feedback only.

const applicationFields = {
  parentName: z.string().trim().min(1),
  childName: z.string().trim().min(1),
  childAge: z.number().int().min(0).max(18),
  homeTown: z.string().trim().min(1),
  homeRegion: regionSchema,
  currentTown: z.string().trim().min(1),
  currentRegion: regionSchema,
  // Year the family was displaced. War displacement began in 2014; cap at the
  // current year. Range lives here (zod), not a DB CHECK.
  displacedYear: z.number().int().min(2014).max(new Date().getFullYear()),
  familyStory: z.string().trim().min(1),
  giftDescription: z.string().trim().min(1),
  giftPrice: z.number().positive().max(99_999_999.99),
  deliveryInformation: z.string().trim().min(1),
  // Campaign-type-specific extras — e.g. the St Nicholas shop link. Validated
  // per campaign type (see stNicholasTypeFieldsSchema).
  typeFields: z.record(z.string(), z.unknown()).optional(),
  // Required consent to share the application with volunteers (§11). A hard
  // gate at submit, so it is NOT persisted — a submitted application has it by
  // definition; applications.submitted_at is the timestamp that carries
  // information.
  consent: z.literal(true),
  // SEPARATE, optional-in-substance consent (form Q20): may we use the letter /
  // child photo on social media? The parent must answer, but either answer is
  // valid — so it's a boolean, never a literal(true).
  socialMediaConsent: z.boolean(),
};

export const applicationSubmitSchema = z.object(applicationFields);
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;

// Per-campaign gift budget ceiling (St Nicholas 2025: 700 UAH). Applied as a
// refinement rather than baked into the schema so the cap can change without a
// migration and without invalidating already-submitted applications.
export function applicationSubmitSchemaForCampaign(campaign: {
  giftPriceCap: string | null;
}) {
  const cap =
    campaign.giftPriceCap === null ? null : Number(campaign.giftPriceCap);
  if (cap === null || !Number.isFinite(cap)) {
    return applicationSubmitSchema;
  }
  return applicationSubmitSchema.superRefine((value, ctx) => {
    if (value.giftPrice > cap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giftPrice"],
        message: "gift_price_over_cap",
      });
    }
  });
}

// Draft: same shape, everything optional, consent not required yet. Provided
// fields are still validated (an out-of-range age is rejected even in a draft).
export const applicationDraftSchema = z
  .object(applicationFields)
  .partial()
  .extend({
    consent: z.boolean().optional(),
    socialMediaConsent: z.boolean().optional(),
  });
export type ApplicationDraftInput = z.infer<typeof applicationDraftSchema>;

// A parent may want several small items that together fit the campaign budget,
// so the shop links are a LIST while the price stays a single total (that's the
// number the budget cap is checked against, and what a volunteer will spend).
//
// The textarea gives us one string; accept newline- or comma-separated links so
// a parent pasting from a phone isn't fighting a format.
export function splitGiftUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const giftUrlsSchema = z
  .preprocess(splitGiftUrls, z.array(z.string().url()).min(1))
  .describe("one or more shop links");

// Campaign-type-specific fields, stored in applications.type_fields (jsonb).
// Kept out of the base columns because they differ per campaign: St Nicholas
// requires a shop link for the exact item; New School Year will want school
// grade and sizes instead.
export const stNicholasTypeFieldsSchema = z.object({
  // One or more links to the exact items. We require real http(s) URLs but do
  // NOT enforce a Ukrainian domain — too many valid shapes (.ua, .com.ua, .com)
  // to encode as a rule, and admin review catches the rest.
  //
  // The 2025 paper form allowed only one link; we deliberately allow several
  // (Vital) because a wish is often two or three small things under one budget.
  giftUrls: giftUrlsSchema,
});
export type StNicholasTypeFields = z.infer<typeof stNicholasTypeFieldsSchema>;

// Validate the base application AND the extras for a given campaign type. The
// per-type schema is applied to type_fields so a St Nicholas submission can't
// land without its shop link.
export const TYPE_FIELDS_SCHEMAS = {
  saint_nicholas_day: stNicholasTypeFieldsSchema,
  new_school_year: z.record(z.string(), z.unknown()), // fields TBD
} as const;

// ---------------------------------------------------------------------------
// FormData → draft values
//
// A <form> sends every field as a string, and an untouched field as "". Naive
// z.coerce.number() turns "" into 0 — which would silently save a child's age
// as 0 — so empties become undefined first and are simply left unsaved.
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const numeric = (schema: z.ZodTypeAny) =>
  z.preprocess((value) => {
    const cleaned = blankToUndefined(value);
    return typeof cleaned === "string" ? Number(cleaned) : cleaned;
  }, schema.optional());

const text = (schema: z.ZodTypeAny) =>
  z.preprocess(blankToUndefined, schema.optional());

// Per-step partial save. Only the keys present in the payload are validated, so
// a step can save without the later steps' fields existing yet — but a value
// that IS provided still has to be valid (an age of 99 is rejected in a draft).
export const applicationDraftFormSchema = z.object({
  parentName: text(z.string().trim().min(1)),
  childName: text(z.string().trim().min(1)),
  childAge: numeric(z.number().int().min(0).max(18)),
  homeTown: text(z.string().trim().min(1)),
  homeRegion: text(regionSchema),
  currentTown: text(z.string().trim().min(1)),
  currentRegion: text(regionSchema),
  displacedYear: numeric(
    z.number().int().min(2014).max(new Date().getFullYear()),
  ),
  familyStory: text(z.string().trim().min(1)),
  giftDescription: text(z.string().trim().min(1)),
  giftUrls: z.preprocess((value) => {
    const urls = splitGiftUrls(value);
    return urls.length === 0 ? undefined : urls;
  }, z.array(z.string().url()).optional()),
  giftPrice: numeric(z.number().positive().max(99_999_999.99)),
  deliveryInformation: text(z.string().trim().min(1)),
  // Not an application column: the delivery step collects it when the parent
  // has no Telegram handle, and it's stored on `users` (one contact per person,
  // never a per-application snapshot).
  phone: text(userPhoneSchema),
  socialMediaConsent: z.preprocess(
    (value) => (value === undefined ? undefined : value === "true"),
    z.boolean().optional(),
  ),
});
export type ApplicationDraftFormInput = z.infer<
  typeof applicationDraftFormSchema
>;

// ---------------------------------------------------------------------------
// Admin edit
//
// An operational override: an admin fixes a wrong address or a typo in a
// child's name that the parent can no longer correct themselves (approval locks
// the parent out — see canEditApplication).
//
// It reuses the parent's field rules rather than inventing looser ones, so an
// admin cannot save an age of 99 or a negative price either. Two differences:
//   - `phone` is absent. The contact lives on `users`, not the application, and
//     a per-application copy is exactly what we decided against in Phase 4.
//   - completeness is conditional. A DRAFT may legitimately have empty fields;
//     anything past draft was submitted complete and must stay that way, so an
//     admin can't blank out a field a volunteer is relying on.
const ADMIN_REQUIRED_FIELDS = [
  "parentName",
  "childName",
  "childAge",
  "homeTown",
  "homeRegion",
  "currentTown",
  "currentRegion",
  "displacedYear",
  "familyStory",
  "giftDescription",
  "giftPrice",
  "deliveryInformation",
  "socialMediaConsent",
] as const;

// A <select> sends "" for "not answered", and the parent form's preprocess maps
// only `undefined` to undefined — so "" would land as `false` ("No") rather than
// "unanswered". An admin editing a draft must be able to leave it unanswered.
const triStateBoolean = z.preprocess((value) => {
  if (value === undefined || value === "" || value === null) {
    return undefined;
  }
  return value === "true" || value === true;
}, z.boolean().optional());

export function adminApplicationEditSchema(context: {
  // Draft applications may stay incomplete; everything else must remain whole.
  requireComplete: boolean;
  campaignType: CampaignType | null;
  giftPriceCap: string | null;
  // The price already stored. The cap is only enforced when the admin actually
  // CHANGES the price: caps change mid-campaign, and an application submitted
  // under an older, higher cap must not become unfixable — an admin correcting
  // a delivery address would otherwise be blocked by a price they never
  // touched. Same reasoning as the parent submit schema keeping the cap as a
  // refinement so it never invalidates already-submitted applications.
  currentGiftPrice: string | null;
}) {
  const base = applicationDraftFormSchema
    .omit({ phone: true, socialMediaConsent: true })
    .extend({ socialMediaConsent: triStateBoolean });

  return base.superRefine((value, ctx) => {
    const cap =
      context.giftPriceCap === null ? null : Number(context.giftPriceCap);
    const priceUnchanged =
      context.currentGiftPrice !== null &&
      value.giftPrice !== undefined &&
      Number(context.currentGiftPrice) === value.giftPrice;
    if (
      cap !== null &&
      Number.isFinite(cap) &&
      value.giftPrice !== undefined &&
      !priceUnchanged &&
      value.giftPrice > cap
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giftPrice"],
        message: "gift_price_over_cap",
      });
    }

    if (!context.requireComplete) {
      return;
    }
    for (const field of ADMIN_REQUIRED_FIELDS) {
      if (value[field] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "required",
        });
      }
    }
    // The shop link is what a volunteer actually buys from, so a St Nicholas
    // application must not lose it.
    if (
      context.campaignType === "saint_nicholas_day" &&
      (value.giftUrls === undefined || value.giftUrls.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["giftUrls"],
        message: "required",
      });
    }
  });
}

export type AdminApplicationEditInput = z.infer<
  ReturnType<typeof adminApplicationEditSchema>
>;
