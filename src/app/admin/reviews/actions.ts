"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import {
  parseReviewStatusFilter,
  reviewsHref,
} from "@/features/reviews/listFilter";
import { setReviewPublished } from "@/features/reviews/queries";
import { requireAdmin } from "@/lib/auth/session";

// Publishing puts a member of the public's words on a public page, so it is an
// admin decision and an audited one. This is the review moderation deferred
// from Phase 5.
export async function setReviewPublishedAction(
  reviewId: string,
  isPublished: boolean,
  // The list's filter, so the admin lands back on the list they were
  // working through. Re-parsed: a bound argument arrives from the client.
  statusFilter?: string,
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
  redirect(reviewsHref(parseReviewStatusFilter(statusFilter)));
}
