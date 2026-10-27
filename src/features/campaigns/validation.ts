import { z } from "zod";

import {
  campaignTypeSchema,
  creatableCampaignTypeSchema,
} from "@/lib/enumSchemas";
import { parseDateOnly, zonedEndOfDay } from "@/lib/zonedDate";

// Creating a campaign. The gift cap is optional (null = no ceiling) and arrives
// from a form as a string; blank means "no cap", not zero.
export const campaignCreateSchema = z.object({
  // Only what we currently offer — enforced on the SERVER, not just by which
  // options the select renders.
  type: creatableCampaignTypeSchema,
  title: z.string().trim().min(1).max(200),
  description: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(2000).nullable(),
  ),
  giftPriceCap: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return null;
      }
      return value.trim();
    },
    z
      .string()
      .regex(/^\d{1,8}(\.\d{1,2})?$/, "invalid_amount")
      .nullable(),
  ),
  // The last day of the campaign. A `<input type="date">` submits YYYY-MM-DD —
  // a CALENDAR date, not an instant — and the column is a timestamptz, so the
  // conversion has to name a zone or the stored value drifts by the server's.
  //
  // It is stored as the last millisecond of that day in Kyiv. Midnight would
  // make «не пізніше 5 грудня» expire on the 4th, and the volunteer briefing
  // formats this value straight back out as a day, so it must not spill into
  // the next one.
  //
  // Blank means "no deadline", which is a real state: the claim briefing drops
  // its whole deadline block rather than promising a date it does not have.
  endsAt: z.preprocess(
    (value) =>
      typeof value !== "string" || value.trim() === "" ? null : value.trim(),
    z
      .string()
      .refine((value) => parseDateOnly(value) !== null, "invalid_date")
      .nullable()
      .transform((value) => (value === null ? null : zonedEndOfDay(value))),
  ),
});
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

// Editing reuses the same field rules with ONE difference: `type` accepts any
// historical value. An archived `new_school_year` campaign must stay editable —
// its type is submitted back as a hidden field, and rejecting it would make the
// row impossible to rename.
export const campaignUpdateSchema = campaignCreateSchema.extend({
  type: campaignTypeSchema,
});
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
