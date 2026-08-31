import { z } from "zod";

import { campaignTypeSchema } from "@/lib/enumSchemas";

// Creating a campaign. The gift cap is optional (null = no ceiling) and arrives
// from a form as a string; blank means "no cap", not zero.
export const campaignCreateSchema = z.object({
  type: campaignTypeSchema,
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
});
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;

// Editing reuses the same field rules. `type` stays in the schema because a
// DRAFT campaign may still change it; the action refuses a change once the
// campaign has left draft, where applications may already depend on it.
export const campaignUpdateSchema = campaignCreateSchema;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
