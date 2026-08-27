"use server";

import { redirect } from "next/navigation";

import { canStartApplication } from "@/features/applications/authz";
import { createDraft } from "@/features/applications/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getResolvedSettings } from "@/features/settings/queries";
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
