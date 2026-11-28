"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAuditLog } from "@/features/audit/log";
import {
  parseReviewListFilter,
  parseReviewsPage,
  reviewsHref,
} from "@/features/reviews/listFilter";
import {
  setReviewInGallery,
  setReviewPublished,
} from "@/features/reviews/queries";
import { requireAdmin } from "@/lib/auth/session";

// Publishing puts a member of the public's words on a public page, so it is an
// admin decision and an audited one. This is the review moderation deferred
// from Phase 5.
export async function setReviewPublishedAction(
  reviewId: string,
  isPublished: boolean,
  // The list's filters and page, so the admin lands back on the list they
  // were working through. Re-parsed: a bound argument arrives from the client.
  filter?: unknown,
  page?: unknown,
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
  redirect(reviewsHref(parseReviewListFilter(filter), parseReviewsPage(page)));
}

// The gallery shows the family's gift photo on public pages, so it is an
// admin decision and an audited one, like publishing. Logged only when a row
// changed: a refused add (consent withdrawn since the page was drawn) is not a
// decision that happened.
export async function setReviewInGalleryAction(
  reviewId: string,
  inGallery: boolean,
  filter?: unknown,
  page?: unknown,
): Promise<void> {
  const admin = await requireAdmin();
  const changed = await setReviewInGallery(reviewId, inGallery);

  if (changed) {
    await recordAuditLog({
      actor: admin,
      action: inGallery
        ? "review.added_to_gallery"
        : "review.removed_from_gallery",
      targetType: "review",
      targetId: reviewId,
    });
  }

  revalidatePath("/admin/reviews");
  redirect(reviewsHref(parseReviewListFilter(filter), parseReviewsPage(page)));
}
