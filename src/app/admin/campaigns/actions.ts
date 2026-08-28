"use server";

import { revalidatePath } from "next/cache";

import {
  activateCampaign,
  archiveCampaign,
  createCampaign,
  setAcceptingApplications,
  setApplicationsEnabled,
} from "@/features/campaigns/adminQueries";
import { campaignCreateSchema } from "@/features/campaigns/validation";
import { recordAuditLog } from "@/features/audit/log";
import type { CampaignActionState } from "@/features/campaigns/formState";
import { requireAdmin } from "@/lib/auth/session";

// Campaign administration. EVERY action calls requireAdmin() first — a server
// action is a public endpoint, so hiding the UI proves nothing. requireAdmin
// throws rather than returning, so a non-admin can't fall through to the work.
//
// Each action that changes what parents can do is audit-logged: opening or
// closing intake decides whether families can apply at all, and we want to be
// able to answer "who closed it, and when".

export async function createCampaignAction(
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const admin = await requireAdmin();

  const parsed = campaignCreateSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    giftPriceCap: formData.get("giftPriceCap"),
  });
  if (!parsed.success) {
    return { status: "invalid" };
  }

  const id = await createCampaign(parsed.data);
  await recordAuditLog({
    actor: admin,
    action: "campaign.created",
    targetType: "campaign",
    targetId: id,
  });
  revalidatePath("/admin/campaigns");
  return { status: "done" };
}

export async function activateCampaignAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  await activateCampaign(id);
  await recordAuditLog({
    actor: admin,
    action: "campaign.activated",
    targetType: "campaign",
    targetId: id,
  });
  // The landing page shows the active campaign, and the parent flow is scoped
  // to it — both go stale the moment this changes.
  revalidatePath("/admin/campaigns");
  revalidatePath("/");
}

export async function archiveCampaignAction(id: string): Promise<void> {
  const admin = await requireAdmin();
  await archiveCampaign(id);
  await recordAuditLog({
    actor: admin,
    action: "campaign.archived",
    targetType: "campaign",
    targetId: id,
  });
  revalidatePath("/admin/campaigns");
  revalidatePath("/");
}

export async function setIntakeAction(
  id: string,
  accepting: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  await setAcceptingApplications(id, accepting);
  await recordAuditLog({
    actor: admin,
    action: accepting ? "campaign.intake_opened" : "campaign.intake_closed",
    targetType: "campaign",
    targetId: id,
  });
  revalidatePath("/admin/campaigns");
}

export async function setKillSwitchAction(enabled: boolean): Promise<void> {
  const admin = await requireAdmin();
  await setApplicationsEnabled(enabled);
  await recordAuditLog({
    actor: admin,
    action: enabled ? "settings.intake_enabled" : "settings.intake_disabled",
    targetType: "settings",
    targetId: null,
  });
  revalidatePath("/admin/campaigns");
}
