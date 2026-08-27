import { z } from "zod";

import { regionSchema } from "@/lib/enumSchemas";

// Base fields required for every campaign (§7). Enforced at SUBMIT — drafts save
// partial data (see applicationDraftSchema), so these are NOT NOT NULL in the DB.
// The server always re-validates; client-side use is inline feedback only.
export const applicationSubmitSchema = z.object({
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
  // Campaign-type-specific extras live here (validated per-type in Phase 4).
  typeFields: z.record(z.string(), z.unknown()).optional(),
  // Explicit data-processing consent — must be true on submit (§11).
  consent: z.literal(true),
});
export type ApplicationSubmitInput = z.infer<typeof applicationSubmitSchema>;

// Draft: same shape, everything optional, consent not required yet. Provided
// fields are still validated (an out-of-range age is rejected even in a draft).
export const applicationDraftSchema = applicationSubmitSchema
  .partial()
  .extend({ consent: z.boolean().optional() });
export type ApplicationDraftInput = z.infer<typeof applicationDraftSchema>;
