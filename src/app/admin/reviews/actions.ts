"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import { setReviewPublished } from "@/features/reviews/queries";
import { requireAdmin } from "@/lib/auth/session";

// Publishing puts a member of the public's words on a public page, so it is an
// admin decision and an audited one. This is the review moderation deferred
// from Phase 5.
export async function setReviewPublishedAction(
  reviewId: string,
  isPublished: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  await setReviewPublished(reviewId, isPublished);

  await recordAuditLog({
    actor: admin,
    action: isPublished ? "review.published" : "review.unpublished",
    targetType: "review",
    targetId: reviewId,
  });

  revalidatePath("/admin/reviews");
  // The landing page renders published reviews.
  revalidatePath("/");
  redirect("/admin/reviews");
}
