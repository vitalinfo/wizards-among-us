"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canEditApplication,
  getSubmitBlockReason,
} from "@/features/applications/authz";
import {
  getMyApplication,
  getUserContactFields,
  grantParentRole,
  saveDraft,
  submitApplication,
} from "@/features/applications/queries";
import {
  applicationSubmitSchemaForCampaign,
  TYPE_FIELDS_SCHEMAS,
} from "@/features/applications/validation";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { verifyTurnstile } from "@/features/turnstile/verify";
import { resolveUserContact } from "@/features/users/contact";
import { setUserPhone } from "@/features/users/queries";
import type {
  SaveDraftState,
  SubmitState,
} from "@/features/applications/formState";
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

  await persistStep(id, actor.id, application, parsed.data);
  revalidatePath(`/parent/applications/${id}`);
  return { status: "saved", errors: {} };
}

// Splits validated step values into real columns and campaign type_fields, and
// keeps the parent's phone on `users` (see features/users/contact.ts for why
// the contact is not copied onto each application).
async function persistStep(
  id: string,
  userId: string,
  application: { typeFields: unknown },
  data: Record<string, unknown>,
): Promise<void> {
  const { giftUrls, phone, ...columns } = data;

  const values: Record<string, unknown> = Object.fromEntries(
    Object.entries(columns).filter(([, value]) => value !== undefined),
  );

  if (giftUrls !== undefined) {
    const existing =
      application.typeFields && typeof application.typeFields === "object"
        ? (application.typeFields as Record<string, unknown>)
        : {};
    values.typeFields = { ...existing, giftUrls };
  }

  if (Object.keys(values).length > 0) {
    await saveDraft(id, userId, values);
  }

  if (typeof phone === "string" && phone.length > 0) {
    await setUserPhone(userId, phone);
  }
}

// Final submit. Re-validates EVERYTHING — the whole application against the
// campaign's schema, plus every authorization gate — because the client only
// ever validated for convenience.
export async function submitApplicationAction(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    return { status: "denied", errors: {}, blockReason: null };
  }

  const id = String(formData.get("applicationId") ?? "");
  const application = await getMyApplication(id, actor.id);
  if (!application) {
    return { status: "denied", errors: {}, blockReason: null };
  }

  // Save whatever the last step submitted first, so a validation failure here
  // never costs the parent their answers.
  const stepValues = applicationDraftFormSchema.safeParse(
    Object.fromEntries(
      [...formData.entries()].filter(
        ([key]) =>
          !["applicationId", "step", "consent", "turnstileToken"].includes(key),
      ),
    ),
  );
  if (stepValues.success) {
    await persistStep(id, actor.id, application, stepValues.data);
  }

  // Captcha guards SUBMIT only (not each draft save), and is checked before we
  // spend any work on validation.
  const captcha = await verifyTurnstile(
    formData.get("turnstileToken")?.toString() ?? null,
  );
  if (!captcha.ok) {
    return {
      status: "invalid",
      errors: { turnstileToken: "captcha" },
      blockReason: null,
    };
  }

  const [campaign, settings, contactFields, fresh] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
    getUserContactFields(actor.id),
    getMyApplication(id, actor.id),
  ]);
  const contact = resolveUserContact(contactFields);

  const blockReason = getSubmitBlockReason(actor, application, {
    campaign,
    settings,
    contactable: contact !== null,
  });
  if (blockReason || !fresh || !campaign) {
    return { status: "blocked", errors: {}, blockReason };
  }

  // The complete application, including the campaign's own type fields and its
  // gift budget ceiling.
  const typeFields =
    fresh.typeFields && typeof fresh.typeFields === "object"
      ? (fresh.typeFields as Record<string, unknown>)
      : {};
  const parsed = applicationSubmitSchemaForCampaign(campaign).safeParse({
    parentName: fresh.parentName,
    childName: fresh.childName,
    childAge: fresh.childAge,
    homeTown: fresh.homeTown,
    homeRegion: fresh.homeRegion,
    currentTown: fresh.currentTown,
    currentRegion: fresh.currentRegion,
    displacedYear: fresh.displacedYear,
    familyStory: fresh.familyStory,
    giftDescription: fresh.giftDescription,
    giftPrice: fresh.giftPrice === null ? undefined : Number(fresh.giftPrice),
    deliveryInformation: fresh.deliveryInformation,
    typeFields,
    consent: formData.get("consent") === "true",
    socialMediaConsent: fresh.socialMediaConsent ?? undefined,
  });

  const typeSchema = TYPE_FIELDS_SCHEMAS[campaign.type];
  const typeParsed = typeSchema.safeParse(typeFields);

  if (!parsed.success || !typeParsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of [
      ...(parsed.success ? [] : parsed.error.issues),
      ...(typeParsed.success ? [] : typeParsed.error.issues),
    ]) {
      const field = String(issue.path[0] ?? "");
      if (field && !errors[field]) {
        errors[field] = issue.message || issue.code;
      }
    }
    return { status: "invalid", errors, blockReason: null };
  }

  const submitted = await submitApplication(id, actor.id, {});
  if (!submitted) {
    // The status guard refused it — someone else already moved it on.
    return { status: "blocked", errors: {}, blockReason: "locked" };
  }

  await grantParentRole(actor.id);
  await recordAuditLog({
    actor,
    action: "application.submitted",
    targetType: "application",
    targetId: id,
  });
  revalidatePath("/parent/applications");
  redirect(`/parent/applications/${id}?submitted=1`);
}
