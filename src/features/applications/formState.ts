import type { SubmitBlockReason } from "./authz";

// Shape of the draft-save result, shared by the server action and the client
// form.
//
// This lives OUTSIDE the "use server" module on purpose: a server-action file
// may only export async functions. Exporting this object from there type-checks
// and builds, then arrives as undefined at runtime — which crashed the form on
// first render with "Cannot convert undefined or null to object".
export type SaveDraftState = {
  status: "idle" | "saved" | "invalid" | "denied";
  // Field name → zod issue code. The client maps codes to Ukrainian copy, so no
  // user-facing strings are produced on the server.
  errors: Record<string, string>;
};

export const initialSaveDraftState: SaveDraftState = {
  status: "idle",
  errors: {},
};

// Result of the final submit. blockReason names WHICH gate refused, so the form
// can explain it instead of showing a dead button (see getSubmitBlockReason).
export type SubmitState = {
  status: "idle" | "invalid" | "blocked" | "denied" | "rate_limited";
  errors: Record<string, string>;
  blockReason: SubmitBlockReason | null;
};

export const initialSubmitState: SubmitState = {
  status: "idle",
  errors: {},
  blockReason: null,
};
