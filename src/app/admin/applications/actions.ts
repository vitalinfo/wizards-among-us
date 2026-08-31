"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  decideApplication,
  getApplicationForAdmin,
  updateApplicationByAdmin,
} from "@/features/applications/adminQueries";
import { describeChangedFields } from "@/features/applications/adminEdit";
import type { AdminEditState } from "@/features/applications/adminEditState";
import { moderationDecisionSchema } from "@/features/applications/moderation";
import type { ModerationActionState } from "@/features/applications/moderationState";
import { recordAuditLog } from "@/features/audit/log";
import { adminApplicationEditSchema } from "@/features/applications/validation";
import { requireAdmin } from "@/lib/auth/session";

// Approve / reject. requireAdmin() first — a server action is a public
// endpoint, so the fact that only /admin links here proves nothing.
export async function decideApplicationAction(
  _prev: ModerationActionState,
  formData: FormData,
): Promise<ModerationActionState> {
  const admin = await requireAdmin();

  const parsed = moderationDecisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    rejectionNote: formData.get("rejectionNote") ?? undefined,
  });
  if (!parsed.success) {
    const missingNote = parsed.error.issues.some(
      (issue) => issue.message === "note_required",
    );
    return { status: missingNote ? "note_required" : "invalid" };
  }

  const { applicationId, decision, rejectionNote } = parsed.data;
  const changed = await decideApplication(
    applicationId,
    decision,
    rejectionNote,
  );
  if (!changed) {
    // The status guard refused it — someone else decided it first, or it isn't
    // awaiting review any more.
    return { status: "already_decided" };
  }

  await recordAuditLog({
    actor: admin,
    action: `application.${decision}`,
    targetType: "application",
    targetId: applicationId,
  });
  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  return { status: "done" };
}

// Admin edit (operational override): a parent locked out by approval can't fix a
// wrong delivery address themselves. Deliberately cannot change status, campaign
// or parent — only the content fields.
export async function updateApplicationAction(
  applicationId: string,
  _prev: AdminEditState,
  formData: FormData,
): Promise<AdminEditState> {
  const admin = await requireAdmin();

  const detail = await getApplicationForAdmin(applicationId);
  if (!detail) {
    return { status: "not_found", errors: {} };
  }
  const { application, campaignType, giftPriceCap } = detail;

  const parsed = adminApplicationEditSchema({
    // A draft may stay incomplete; anything past draft was submitted whole and
    // must remain so — an admin must not be able to blank out a field a
    // volunteer is relying on.
    requireComplete: application.status !== "draft",
    campaignType,
    giftPriceCap,
    currentGiftPrice: application.giftPrice,
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    // Field-keyed so each input can show its own message.
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in errors)) {
        errors[key] = issue.message;
      }
    }
    return { status: "invalid", errors };
  }

  const { giftUrls, ...fields } = parsed.data;
  await updateApplicationByAdmin(applicationId, {
    ...fields,
    // typeFields carries the shop link; merge rather than replace so a future
    // campaign type's extras aren't dropped by an edit that didn't know them.
    typeFields:
      giftUrls === undefined
        ? ((application.typeFields as Record<string, unknown> | null) ?? null)
        : {
            ...((application.typeFields as Record<string, unknown> | null) ??
              {}),
            giftUrls,
          },
  });

  // Field NAMES, never values: this is a child's address and family story, and
  // the audit log is a second place that data would then live. Names are enough
  // to answer "who changed what, and when".
  const changed = describeChangedFields(application, parsed.data);
  await recordAuditLog({
    actor: admin,
    action: changed
      ? `application.updated_by_admin:${changed}`
      : "application.updated_by_admin",
    targetType: "application",
    targetId: applicationId,
  });

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath(`/parent/applications/${applicationId}`);
  redirect(`/admin/applications/${applicationId}`);
}
