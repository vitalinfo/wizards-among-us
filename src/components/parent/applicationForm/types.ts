import type { ContactMethod } from "@/db/enums";
import type { applications } from "@/db/schema";

export type ApplicationRow = typeof applications.$inferSelect;

// Values are strings/numbers because they come from (and go back into) form
// controls; the server coerces and validates them (applicationDraftFormSchema).
// Booleans are normalized to "true"/"false" by toStepValues below, so a step
// never has to cast when handing a value to an <input defaultValue>.
export type StepValues = Record<string, string | number | null | undefined>;

// Flattens an application row into form-control values: type_fields (jsonb) is
// spread alongside the columns, so a campaign-specific field like the St
// Nicholas shop link is just another named input.
export function toStepValues(application: ApplicationRow): StepValues {
  const typeFields =
    application.typeFields && typeof application.typeFields === "object"
      ? (application.typeFields as Record<string, unknown>)
      : {};

  const flat: StepValues = {};
  for (const [key, value] of Object.entries({
    ...application,
    ...typeFields,
  })) {
    // A list of links round-trips through a textarea as one per line.
    if (Array.isArray(value)) {
      flat[key] = value.join("\n");
      continue;
    }
    if (value === null || value === undefined) {
      flat[key] = undefined;
    } else if (typeof value === "boolean") {
      flat[key] = String(value);
    } else if (typeof value === "string" || typeof value === "number") {
      flat[key] = value;
    }
    // Dates and nested objects are not form values — skipped on purpose.
  }
  return flat;
}

export type StepProps = {
  values: StepValues;
  // Field name → already-translated message. Empty when the step is clean.
  errors: Record<string, string | undefined>;
  // The parent's resolved contact, so the delivery step only asks for a phone
  // when there's no Telegram handle to use.
  contact?: { method: ContactMethod; value: string } | null;
  // Campaign budget ceiling in UAH, shown up front on the gift step.
  giftPriceCap?: string | null;
};
