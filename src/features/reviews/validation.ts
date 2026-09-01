import { z } from "zod";

// A review is a thank-you, so the rating is the required part and the words are
// optional — plenty of people will tap five stars and nothing else, and
// demanding prose would lose those.
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).nullable(),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

// FormData arrives as strings; an untouched textarea is "".
export const reviewFormSchema = z.object({
  rating: z.preprocess(
    (value) => (typeof value === "string" ? Number(value) : value),
    z.number().int().min(1).max(5),
  ),
  body: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(2000).nullable(),
  ),
});
