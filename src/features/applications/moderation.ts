import { z } from "zod";

// The moderation decision, validated the same way on the client (which renders
// the error) and in the server action (which is the real gate).
//
// Kept out of the "use server" module so it can be unit-tested and imported by
// the form — such a module may only export async functions.
//
// The note is REQUIRED for a rejection because rejection is final: the parent
// cannot edit and resubmit, so this text is the only explanation they ever get.
// It is dropped for an approval rather than kept, so a stale note from an
// abandoned rejection can't survive on an approved application.
export const moderationDecisionSchema = z
  .object({
    applicationId: z.string().uuid(),
    decision: z.enum(["approved", "rejected"]),
    rejectionNote: z.string().trim().optional().default(""),
  })
  .refine(
    (value) => value.decision !== "rejected" || value.rejectionNote.length > 0,
    { path: ["rejectionNote"], message: "note_required" },
  )
  .transform((value) => ({
    applicationId: value.applicationId,
    decision: value.decision,
    rejectionNote: value.decision === "rejected" ? value.rejectionNote : null,
  }));

export type ModerationDecisionInput = z.infer<typeof moderationDecisionSchema>;
