"use server";

import { revalidatePath } from "next/cache";

import { decideApplication } from "@/features/applications/adminQueries";
import { moderationDecisionSchema } from "@/features/applications/moderation";
import type { ModerationActionState } from "@/features/applications/moderationState";
import { recordAuditLog } from "@/features/audit/log";
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
