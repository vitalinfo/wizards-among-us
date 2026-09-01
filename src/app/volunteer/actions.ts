"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import { claimApplication, getActiveClaim } from "@/features/claims/queries";
import { getApplicationForFileAccess } from "@/features/applications/queries";
import {
  addVolunteerRole,
  getUserContact,
  setUserPhone,
} from "@/features/users/queries";
import { consumeRateLimit } from "@/features/rateLimit/queries";
import { isContactable } from "@/features/users/contact";
import { userPhoneSchema } from "@/features/users/contact";
import { getClaimBlockReason } from "@/lib/authz";
import { safeReturnPath } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { isUser } from "@/lib/actor";
import type { VolunteerActionState } from "@/features/claims/formState";

// Opt in as a volunteer. Self-serve (Phase 6 decision) — nothing else grants
// the role, and canBrowseChildren requires it.
export async function becomeVolunteerAction(formData: FormData): Promise<void> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login?next=%2Fvolunteer");
  }

  await addVolunteerRole(actor.id);
  await recordAuditLog({
    actor,
    action: "user.became_volunteer",
    targetType: "user",
    targetId: actor.id,
  });
  revalidatePath("/volunteer");
  redirect(
    safeReturnPath(String(formData.get("next") ?? "")) || "/volunteer/children",
  );
}

// Add a phone so the family can reach this volunteer. Required before claiming
// when they have no Telegram @username (Phase 6 decision, mirroring the parent
// side's submit gate).
export async function saveVolunteerPhoneAction(
  _prev: VolunteerActionState,
  formData: FormData,
): Promise<VolunteerActionState> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login?next=%2Fvolunteer%2Fcontact");
  }

  const parsed = userPhoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { status: "invalid" };
  }
  await setUserPhone(actor.id, parsed.data);
  revalidatePath("/volunteer/children");
  redirect(safeReturnPath(String(formData.get("next") ?? "")));
}

// Claim a child. The gate is re-checked here even though the UI hides the
// button — a server action is a public endpoint.
export async function claimAction(
  applicationId: string,
  returnTo: string,
): Promise<void> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  // Keyed by USER: a script grabbing every child would otherwise outpace real
  // volunteers reading the cards. Well above any honest browsing rate.
  const gate = await consumeRateLimit("claim", {
    kind: "user",
    value: actor.id,
  });
  if (!gate.allowed) {
    redirect(`${safeReturnPath(returnTo)}`);
  }

  const context = await getApplicationForFileAccess(applicationId);
  if (!context) {
    redirect("/volunteer/children");
  }

  const contact = await getUserContact(actor.id);
  const blocked = getClaimBlockReason(
    actor,
    context.application,
    await getActiveClaim(applicationId),
    { contactable: isContactable(contact) },
  );
  if (blocked === "no_contact") {
    // Send them to add one rather than refusing — the whole point is that the
    // family must be able to reach them.
    redirect(`/volunteer/contact?next=${encodeURIComponent(returnTo)}`);
  }
  if (blocked) {
    redirect(safeReturnPath(returnTo));
  }

  const outcome = await claimApplication(applicationId, actor.id);
  await recordAuditLog({
    actor,
    action: outcome === "claimed" ? "claim.created" : "claim.lost_race",
    targetType: "application",
    targetId: applicationId,
  });

  revalidatePath("/volunteer/children");
  revalidatePath("/volunteer/claims");
  redirect(
    outcome === "claimed" ? "/volunteer/claims" : safeReturnPath(returnTo),
  );
}
