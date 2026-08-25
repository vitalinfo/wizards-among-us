import { z } from "zod";

import { contactMethodSchema, regionSchema } from "@/lib/enumSchemas";

// Base fields required for every campaign (§7), modelled on the real
// «Святий Миколай 2025» form (docs/reference/st-nicholas-2025-google-form.pdf).
// Enforced at SUBMIT — drafts save partial data (see applicationDraftSchema), so
// these are NOT NOT NULL in the DB. The server always re-validates; client-side
// use is inline feedback only.

// Telegram usernames: 5–32 chars, letters/digits/underscore. We accept a leading
// @ (the form asked for "нік @") and strip it, so stored values match
// users.username and can be turned into a t.me link.
const TELEGRAM_HANDLE = /^[A-Za-z0-9_]{5,32}$/;
// Ukrainian mobile in the form the 2025 form asked for: +38 0XX XXX XX XX.
const UA_PHONE = /^\+380\d{9}$/;

// A usable contact for the volunteer who claims: either a Telegram handle or a
// phone number. Which one is validated depends on contactMethod — a phone in the
// telegram field would be a dead link at exactly the wrong moment.
export const contactSchema = z
  .object({
    contactMethod: contactMethodSchema,
    contact: z.string().trim().min(1),
  })
  .transform(({ contactMethod, contact }) => ({
    contactMethod,
    contact:
      contactMethod === "telegram"
        ? contact.replace(/^@/, "")
        : contact.replace(/[\s()-]/g, ""),
  }))
  .superRefine(({ contactMethod, contact }, ctx) => {
    const ok =
      contactMethod === "telegram"
        ? TELEGRAM_HANDLE.test(contact)
        : UA_PHONE.test(contact);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contact"],
        message:
          contactMethod === "telegram"
            ? "invalid_telegram_handle"
            : "invalid_ua_phone",
      });
    }
  });

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
  contactMethod: contactMethodSchema,
  contact: z.string().trim().min(1),
  giftDescription: z.string().trim().min(1),
  // Link to the exact item in a shop. We require a real http(s) URL but do NOT
  // enforce a Ukrainian domain — too many valid shapes (.ua, .com.ua, .com) to
  // encode as a rule; the admin review step catches the rest.
  giftUrl: z.string().trim().url(),
  giftPrice: z.number().positive().max(99_999_999.99),
  deliveryInformation: z.string().trim().min(1),
  // Campaign-type-specific extras.
  typeFields: z.record(z.string(), z.unknown()).optional(),
  // Required consent to share the application with volunteers (§11). Persisted
  // as applications.consent_at (a timestamp, not a flag).
  consent: z.literal(true),
  // SEPARATE, optional-in-substance consent (form Q20): may we use the letter /
  // child photo on social media? The parent must answer, but either answer is
  // valid — so it's a boolean, never a literal(true).
  socialMediaConsent: z.boolean(),
};

export const applicationSubmitSchema = z
  .object(applicationFields)
  .superRefine((value, ctx) => {
    const parsed = contactSchema.safeParse({
      contactMethod: value.contactMethod,
      contact: value.contact,
    });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({ ...issue, path: ["contact"] });
      }
    }
  });
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
