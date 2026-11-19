import type { ZodIssue } from "zod";

import type { SubmitBlockReason } from "./authz";

// One stable code per zod issue, for the client to translate.
//
// A format failure (url, email, regex, …) is one code, `invalid_format`, with
// WHICH format in `issue.format` — so a bad link would show the generic
// «Некоректне значення» and the «Некоректне посилання» copy would be
// unreachable. Fold the format into the code: `invalid_url`. Never match on
// zod's English message instead; it works only until zod rewords it.
//
// Custom refinements already carry our own code as their message
// (`gift_price_over_cap`), so those pass through.
export function issueCode(issue: ZodIssue): string {
  if (issue.code === "custom") {
    return issue.message || issue.code;
  }
  if (issue.code === "invalid_format") {
    return `invalid_${issue.format}`;
  }
  return issue.code;
}

// Shape of the draft-save result, shared by the server action and the client
// form.
//
// This lives OUTSIDE the "use server" module on purpose: a server-action file
// may only export async functions. Exporting this object from there type-checks
// and builds, then arrives as undefined at runtime — which crashed the form on
// first render with "Cannot convert undefined or null to object".
export type SaveDraftState = {
  status: "idle" | "saved" | "invalid" | "denied" | "missing_files";
  // Which uploads this step is waiting for, so the message can name them.
  missingUploads?: readonly string[];
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
