// Result shape for the review form. Outside the "use server" module, which may
// only export async functions.
export type ReviewActionState = {
  status: "idle" | "invalid" | "blocked" | "done";
  reason?: string;
};

export const initialReviewActionState: ReviewActionState = { status: "idle" };
