import type { applications } from "@/db/schema";

export type ApplicationRow = typeof applications.$inferSelect;

// Values are strings because they come from (and go back into) form controls;
// the server coerces and validates them (applicationDraftFormSchema).
export type StepValues = Record<string, string | number | null | undefined>;

export type StepProps = {
  values: StepValues;
  // Field name → already-translated message. Empty when the step is clean.
  errors: Record<string, string | undefined>;
};
