"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canStartApplication } from "@/features/applications/authz";
import {
  createDraft,
  getMyApplication,
  markFulfilled,
} from "@/features/applications/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getResolvedSettings } from "@/features/settings/queries";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { getConfirmBlockReason } from "@/lib/authz";
import { getSessionActor } from "@/lib/auth/session";
import { isUser } from "@/lib/actor";

// Starts a new application and sends the parent straight into the form.
//
// Every gate is re-checked HERE even though the UI already hid the button: a
// server action is a public endpoint, so the client-side state is UX only.
export async function startApplication(): Promise<void> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);

  if (!campaign || !canStartApplication(actor, { campaign, settings })) {
    redirect("/parent/applications");
  }

  const id = await createDraft(actor.id, campaign.id);
  await recordAuditLog({
    actor,
    action: "application.draft_created",
    targetType: "application",
    targetId: id,
  });

  redirect(`/parent/applications/${id}`);
}

// The parent closes the loop: the gift arrived. Re-checked here even though the
// page hides the button — a server action is a public endpoint.
export async function confirmReceiptAction(
  applicationId: string,
): Promise<void> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    redirect("/parent/applications");
  }

  const files = await listApplicationFiles(applicationId);
  const blocked = getConfirmBlockReason(actor, application, {
    hasConfirmationPhoto: files.some((file) => file.kind === "confirmation"),
  });
  if (blocked) {
    redirect(
      `/parent/applications/${applicationId}/confirm?blocked=${blocked}`,
    );
  }

  // Guarded on `claimed` in SQL too, so a double submit can't double-fire.
  const done = await markFulfilled(applicationId, actor.id);
  await recordAuditLog({
    actor,
    action: done ? "application.fulfilled" : "application.fulfil_noop",
    targetType: "application",
    targetId: applicationId,
  });

  revalidatePath("/parent/applications");
  revalidatePath(`/parent/applications/${applicationId}`);
  revalidatePath("/volunteer/claims");
  // Straight to the review: it is the natural next thing to say, and reviews
  // are only offered once a wish is fulfilled (Vital, Phase 7).
  redirect(`/parent/review?application=${applicationId}`);
}
