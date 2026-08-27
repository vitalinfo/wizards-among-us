"use server";

import { revalidatePath } from "next/cache";

import { canEditApplication } from "@/features/applications/authz";
import { getMyApplication, saveDraft } from "@/features/applications/queries";
import type { SaveDraftState } from "@/features/applications/formState";
import { applicationDraftFormSchema } from "@/features/applications/validation";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";

// Saves whatever the current step submitted. Partial by design: a parent can
// stop mid-form and come back, which is the whole point of drafts for people
// filling this in on a phone under stress.
export async function saveApplicationDraft(
  _prev: SaveDraftState,
  formData: FormData,
): Promise<SaveDraftState> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    return { status: "denied", errors: {} };
  }

  const id = String(formData.get("applicationId") ?? "");
  const application = await getMyApplication(id, actor.id);
  // Re-checked server-side even though the UI hides the form: a server action
  // is a public endpoint. This also enforces the edit lock — an approved
  // application can't be edited even by its owner.
  if (!application || !canEditApplication(actor, application)) {
    return { status: "denied", errors: {} };
  }

  // Only the keys this step actually submitted, so saving step 1 doesn't wipe
  // step 3's answers.
  const submitted = Object.fromEntries(
    [...formData.entries()].filter(
      ([key]) => key !== "applicationId" && key !== "step",
    ),
  );

  const parsed = applicationDraftFormSchema.safeParse(submitted);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "");
      if (field && !errors[field]) {
        errors[field] = issue.code;
      }
    }
    return { status: "invalid", errors };
  }

  const values = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(values).length > 0) {
    await saveDraft(id, actor.id, values);
    revalidatePath(`/parent/applications/${id}`);
  }

  return { status: "saved", errors: {} };
}
