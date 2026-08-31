"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  activateCampaign,
  archiveCampaign,
  createCampaign,
  getAdminCampaign,
  setAcceptingApplications,
  updateCampaign,
  updateDraftCampaignType,
} from "@/features/campaigns/adminQueries";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
} from "@/features/campaigns/validation";
import { recordAuditLog } from "@/features/audit/log";
import type { CampaignActionState } from "@/features/campaigns/formState";
import { requireAdmin } from "@/lib/auth/session";

// Campaign administration. EVERY action calls requireAdmin() first — a server
// action is a public endpoint, so hiding the UI proves nothing. requireAdmin
// throws rather than returning, so a non-admin can't fall through to the work.
//
// Every action ends in redirect("/admin/campaigns"). That is not cosmetic:
//   1. The confirmation is a page state (?confirm=…&id=…) and the form posts to
//      the CURRENT url, so without this the prompt renders again over an action
//      that already ran — which is exactly what it looked like the first time.
//   2. POST → redirect → GET, so a reload after acting re-requests the list
//      instead of re-posting the action.
// redirect() throws, so nothing after it runs and the void return is satisfied
// by the throw.
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
  // redirect() throws, so nothing after it runs — the return type is satisfied
  // by the throw, not by reaching a return.
  redirect("/admin/campaigns");
}

// Editing. The type is only writable while the campaign is a DRAFT: once it has
// gone live, applications carry type_fields validated against it, and changing
// it would leave them describing a form nobody fills in any more.
export async function updateCampaignAction(
  id: string,
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const admin = await requireAdmin();

  const existing = await getAdminCampaign(id);
  if (!existing) {
    return { status: "not_found" };
  }

  const parsed = campaignUpdateSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    giftPriceCap: formData.get("giftPriceCap"),
  });
  if (!parsed.success) {
    return { status: "invalid" };
  }

  const { type, ...fields } = parsed.data;
  if (type !== existing.type) {
    if (existing.status !== "draft") {
      return { status: "type_locked" };
    }
    await updateDraftCampaignType(id, type);
  }
  await updateCampaign(id, fields);

  await recordAuditLog({
    actor: admin,
    action: "campaign.updated",
    targetType: "campaign",
    targetId: id,
  });
  revalidatePath("/admin/campaigns");
  revalidatePath("/");
  redirect("/admin/campaigns");
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
  redirect("/admin/campaigns");
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
  redirect("/admin/campaigns");
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
  // The parent entry point renders "we are not accepting applications" from this.
  revalidatePath("/parent");
  revalidatePath("/parent/applications");
  redirect("/admin/campaigns");
}
