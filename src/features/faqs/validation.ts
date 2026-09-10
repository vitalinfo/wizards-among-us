import { z } from "zod";

import { faqStatusSchema } from "@/lib/enumSchemas";

// One FAQ entry as an admin writes it. Both halves are REQUIRED: a question
// with no answer, or an answer with no question, renders as a broken accordion
// row on the public page — the DB columns are notNull for the same reason.
//
// The ordinal is deliberately absent. Position is set by the move actions
// (which renumber the whole list), so exposing a raw number here would let two
// rows claim the same slot and make "save" and "move up" disagree about what
// the order is.
export const faqInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  status: faqStatusSchema,
});
export type FaqInput = z.infer<typeof faqInputSchema>;
