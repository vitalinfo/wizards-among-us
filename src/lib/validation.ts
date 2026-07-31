import { z } from "zod";

import {
  APPLICATION_STATUSES,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  FILE_KINDS,
  UKRAINE_REGIONS,
  USER_ROLES,
} from "@/db/enums";

// Shared zod schemas — reused on the client (inline feedback) and the server
// (the authoritative gate; the server always re-validates). Built from the same
// enum arrays as the DB schema so DB, TS types, and validation never drift.

export const userRoleSchema = z.enum(USER_ROLES);
export const campaignTypeSchema = z.enum(CAMPAIGN_TYPES);
export const campaignStatusSchema = z.enum(CAMPAIGN_STATUSES);
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const fileKindSchema = z.enum(FILE_KINDS);
export const regionSchema = z.enum(UKRAINE_REGIONS);

// Base fields required for every campaign (§7). Enforced at SUBMIT — drafts save
// partial data (see applicationDraftSchema), so these are NOT NOT NULL in the DB.
export const applicationSubmitSchema = z.object({
  parentName: z.string().trim().min(1),
  childName: z.string().trim().min(1),
  childAge: z.number().int().min(0).max(18),
  homeTown: z.string().trim().min(1),
  homeRegion: regionSchema,
  currentTown: z.string().trim().min(1),
  currentRegion: regionSchema,
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
