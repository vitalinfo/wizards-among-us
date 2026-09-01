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
import {
  missingStepUploads,
  stepsForCampaignType,
} from "@/components/parent/applicationForm/steps";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { missingUploads } from "@/features/applications/files";
import { recordAuditLog } from "@/features/audit/log";
import {
  getActiveCampaignForIntake,
  getCampaignById,
} from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { verifyTurnstile } from "@/features/turnstile/verify";
import { resolveUserContact } from "@/features/users/contact";
import { setUserPhone } from "@/features/users/queries";
import {
  issueCode,
  type SaveDraftState,
  type SubmitState,
} from "@/features/applications/formState";
import { applicationDraftFormSchema } from "@/features/applications/validation";
import { isUser } from "@/lib/actor";
import { consumeRateLimit } from "@/features/rateLimit/queries";
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
        errors[field] = issueCode(issue);
      }
    }
    return { status: "invalid", errors };
  }

  // Save first, ALWAYS — a missing photo must never cost the parent the answers
  // they just typed into this step.
  await persistStep(id, actor.id, application, parsed.data);
  revalidatePath(`/parent/applications/${id}`);

  // Then refuse to advance if this step's uploads are not there. Caught here
  // rather than at submit, so the parent fixes it on the step that asks for it
  // instead of being sent back three steps at the end. Server-side, so it holds
  // whether or not the client JS is doing its job.
  const stepKey = String(formData.get("step") ?? "");
  const campaign = await getCampaignById(application.campaignId);
  const step = campaign
    ? stepsForCampaignType(campaign.type)?.find((s) => s.key === stepKey)
    : undefined;
  if (step) {
    const uploaded = await listApplicationFiles(id);
    const missing = missingStepUploads(
      step,
      uploaded.map((file) => file.kind),
    );
    if (missing.length > 0) {
      return { status: "missing_files", errors: {}, missingUploads: missing };
    }
  }

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

  // Rate limit AFTER the draft save (a parent must never lose their answers to
  // a limiter) but BEFORE the captcha and the real validation, which are the
  // expensive parts. Keyed by USER, not address: families share networks, and
  // one household filing for three children must not exhaust a shared IP.
  const gate = await consumeRateLimit("applicationSubmit", {
    kind: "user",
    value: actor.id,
  });
  if (!gate.allowed) {
    return { status: "rate_limited", errors: {}, blockReason: null };
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

  const [activeCampaign, campaign, settings, contactFields, fresh] =
    await Promise.all([
      getActiveCampaignForIntake(),
      // The application's OWN campaign decides which type_fields schema and
      // budget cap apply; the ACTIVE one decides whether intake is open at all.
      getCampaignById(application.campaignId),
      getResolvedSettings(),
      getUserContactFields(actor.id),
      getMyApplication(id, actor.id),
    ]);
  const contact = resolveUserContact(contactFields);

  // The three uploads the form marks required. Checked here because a
  // `required` attribute cannot block a submit and a server action is public.
  const uploaded = await listApplicationFiles(id);
  const missing = campaign
    ? missingUploads(
        campaign.type,
        uploaded.map((file) => file.kind),
      )
    : [];

  const blockReason = getSubmitBlockReason(actor, application, {
    campaign: activeCampaign,
    settings,
    contactable: contact !== null,
    missingUploads: missing,
  });
  if (blockReason || !fresh || !campaign) {
    return { status: "blocked", errors: {}, blockReason };
  }

  // A draft left over from a previous campaign can't be submitted into the
  // current one: its answers were written against a different form, and its
  // budget cap and type fields may differ.
  if (campaign.id !== activeCampaign?.id) {
    return { status: "blocked", errors: {}, blockReason: "intake_closed" };
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
        errors[field] = issueCode(issue);
      }
    }
    return { status: "invalid", errors, blockReason: null };
  }

  // Was this the first submission, or a parent saving an edit to one already
  // sent? Read before the write, so the two cases can be told apart afterwards.
  const wasAlreadySubmitted = application.status === "submitted";

  const submitted = await submitApplication(id, actor.id, {});
  if (!submitted) {
    // The SQL guard refused it, which now means only one thing: an admin
    // decided the application between this page loading and the parent pressing
    // the button. Re-submitting an already-submitted one is allowed.
    return { status: "blocked", errors: {}, blockReason: "locked" };
  }

  await grantParentRole(actor.id);
  // Distinct actions, because the audit trail answers "when did this family
  // apply?". Logging every edit as a submission would show a family applying
  // five times for editing five times, and would stop matching submitted_at,
  // which is set once.
  await recordAuditLog({
    actor,
    action: wasAlreadySubmitted
      ? "application.updated_by_parent"
      : "application.submitted",
    targetType: "application",
    targetId: id,
  });
  revalidatePath("/parent/applications");
  // To the LIST, not back into the form. Returning to the application left the
  // parent looking at the last step of a form they had just finished, which
  // reads as "nothing happened"; the list is where they can see the new status
  // and get on with the next child.
  //
  // «Анкету подано — ми перевіримо протягом двох днів» is true once. For an
  // edit it announces a submission that happened days ago and restates a
  // promise whose clock did not restart, so the two cases say different things.
  redirect(
    `/parent/applications?${wasAlreadySubmitted ? "saved=1" : "submitted=1"}`,
  );
}
