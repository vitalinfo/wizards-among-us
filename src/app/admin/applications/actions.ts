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
import { getApplicationForFileAccess } from "@/features/applications/queries";
import { adminApplicationEditSchema } from "@/features/applications/validation";
import { assignVolunteer, releaseClaim } from "@/features/claims/queries";
import { isContactable } from "@/features/users/contact";
import { getUserContact } from "@/features/users/queries";
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

// Assign a volunteer to an application by hand (plan §9 Phase 6).
//
// Goes through the SAME write path as a self-claim — one transaction, the same
// unique index — so the "no double claim" invariant cannot be broken by an
// admin override. Reassignment replaces the incumbent rather than inserting a
// second row.
export async function assignVolunteerAction(
  applicationId: string,
  volunteerId: string,
): Promise<void> {
  const admin = await requireAdmin();

  const context = await getApplicationForFileAccess(applicationId);
  if (!context) {
    redirect("/admin/applications");
  }

  // The contact gate applies to an admin assignment too: the point is that the
  // FAMILY can reach the volunteer, which is unaffected by who recorded it.
  const volunteer = await getUserContact(volunteerId);
  if (!isContactable(volunteer)) {
    redirect(`/admin/applications/${applicationId}?assignError=no_contact`);
  }

  const outcome = await assignVolunteer(applicationId, volunteerId);

  // Logged DISTINCTLY from a self-claim: "who decided this volunteer gets this
  // child" is exactly the question the audit trail exists to answer, and an
  // admin assignment is a different answer from a volunteer choosing.
  await recordAuditLog({
    actor: admin,
    action:
      outcome === "claimed" ? "claim.assigned_by_admin" : "claim.assign_failed",
    targetType: "application",
    targetId: applicationId,
  });

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/volunteer/children");
  redirect(`/admin/applications/${applicationId}`);
}

// Release a claim. Admin only by decision (Phase 6): a volunteer who cannot
// follow through contacts the coordinator, so a human sees every drop-out.
export async function releaseClaimAction(applicationId: string): Promise<void> {
  const admin = await requireAdmin();
  const released = await releaseClaim(applicationId);

  await recordAuditLog({
    actor: admin,
    action: released ? "claim.released_by_admin" : "claim.release_noop",
    targetType: "application",
    targetId: applicationId,
  });

  revalidatePath(`/admin/applications/${applicationId}`);
  revalidatePath("/volunteer/children");
  redirect(`/admin/applications/${applicationId}`);
}
