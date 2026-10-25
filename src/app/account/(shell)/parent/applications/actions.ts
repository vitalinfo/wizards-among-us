"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  applicationsHref,
  parseApplicationsQuery,
} from "@/features/applications/applicationTabs";
import {
  canDeleteApplication,
  canStartApplication,
} from "@/features/applications/authz";
import {
  createDraft,
  deleteMyDraft,
  getMyApplication,
  markFulfilled,
} from "@/features/applications/queries";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getResolvedSettings } from "@/features/settings/queries";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { getConfirmBlockReason } from "@/lib/authz";
import { deleteStoredObjects } from "@/lib/storage/client";
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
    redirect("/account/parent/applications");
  }

  const id = await createDraft(actor.id, campaign.id);
  await recordAuditLog({
    actor,
    action: "application.draft_created",
    targetType: "application",
    targetId: id,
  });

  redirect(`/account/parent/applications/${id}`);
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
    redirect("/account/parent/applications");
  }

  const files = await listApplicationFiles(applicationId);
  const blocked = getConfirmBlockReason(actor, application, {
    hasConfirmationPhoto: files.some((file) => file.kind === "confirmation"),
  });
  if (blocked) {
    redirect(
      `/account/parent/applications/${applicationId}/confirm?blocked=${blocked}`,
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

  revalidatePath("/account/parent/applications");
  revalidatePath(`/account/parent/applications/${applicationId}`);
  revalidatePath("/account/volunteer/claims");
  // Straight to the review: it is the natural next thing to say, and reviews
  // are only offered once a wish is fulfilled (Vital, Phase 7).
  redirect(`/account/parent/review?application=${applicationId}`);
}

// The parent deletes one of their drafts, from the confirmation on «Мої
// заявки».
//
// Re-checked here even though only a draft's row offers the bin: a server
// action is a public endpoint. And re-checked AGAIN in the SQL (deleteMyDraft),
// because a draft can be submitted in another tab between this check and the
// delete.
//
// `view` is the tab and page the list was on, bound by the page. Bound
// arguments make a round trip through the browser, so it is parsed down to
// known values and the url rebuilt from them — never used as given, which
// would make this an open redirect.
export async function deleteDraftAction(
  applicationId: string,
  view: { tab: string; page: number },
): Promise<void> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  const list = applicationsHref(
    parseApplicationsQuery({ tab: String(view.tab), page: String(view.page) }),
  );

  const application = await getMyApplication(applicationId, actor.id);
  if (!application || !canDeleteApplication(actor, application)) {
    redirect(list);
  }

  const { deleted, storageKeys } = await deleteMyDraft(applicationId, actor.id);
  await recordAuditLog({
    actor,
    action: deleted ? "application.draft_deleted" : "application.delete_noop",
    targetType: "application",
    targetId: applicationId,
  });
  // After the rows are gone, so nothing can serve these objects any more.
  await deleteStoredObjects(storageKeys);

  revalidatePath("/account/parent/applications");
  redirect(list);
}
