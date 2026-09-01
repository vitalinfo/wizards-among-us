"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getMyApplication } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import type { ReviewActionState } from "@/features/reviews/formState";
import { createReview, hasReviewed } from "@/features/reviews/queries";
import { getReviewBlockReason } from "@/features/reviews/authz";
import { reviewFormSchema } from "@/features/reviews/validation";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";

export async function submitReviewAction(
  applicationId: string,
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    return { status: "blocked", reason: "not_owner" };
  }

  // Re-checked server-side even though the page hides the form.
  const blocked = getReviewBlockReason(actor, application, {
    alreadyReviewed: await hasReviewed(actor.id, applicationId),
  });
  if (blocked) {
    return { status: "blocked", reason: blocked };
  }

  const parsed = reviewFormSchema.safeParse({
    rating: formData.get("rating"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { status: "invalid" };
  }

  const id = await createReview({
    userId: actor.id,
    applicationId,
    rating: parsed.data.rating,
    body: parsed.data.body,
  });
  await recordAuditLog({
    actor,
    action: "review.created",
    targetType: "review",
    targetId: id,
  });

  // Unpublished until an admin says otherwise, so nothing changes publicly yet.
  revalidatePath("/admin/reviews");
  redirect("/parent/applications?reviewed=1");
}
