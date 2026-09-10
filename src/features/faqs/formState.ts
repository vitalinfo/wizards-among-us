// Result shape for the FAQ admin form.
//
// Lives OUTSIDE the "use server" module because such a file may only export
// async functions — exporting this object from actions.ts type-checks and
// builds, then fails at runtime with "A 'use server' file can only export
// async functions, found object" (same trap as campaigns/formState.ts).
export type FaqActionState = {
  status: "idle" | "invalid" | "not_found";
};

export const initialFaqActionState: FaqActionState = { status: "idle" };
