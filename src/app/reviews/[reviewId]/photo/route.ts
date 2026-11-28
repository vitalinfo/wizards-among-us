import { type NextRequest } from "next/server";

import { getPublicReviewPhoto } from "@/features/reviews/queries";
import {
  notFound,
  publicPhotoResponse,
} from "@/lib/storage/publicPhotoResponse";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

// The family's photo with the gift, on the public «Відгуки» page.
//
// One of the two file routes that need no session (the gallery's is the
// other): the parent consented to this photo being published on the site
// (`social_media_consent`), and the page it sits on is open to anyone.
// Everything that makes it publishable is checked in the query on every read —
// the review is published, the application consented, the file is a
// confirmation photo — so unpublishing the review or withdrawing the consent
// takes the photo down on the next request.
//
// Not audit-logged per read, unlike /api/applications/…/files: there is no
// actor to log, and a published photo is not a reveal of tier-protected data.
// The decision that made it public is logged — `review.published`.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  if (!isUuid(reviewId)) {
    return notFound();
  }
  return publicPhotoResponse(await getPublicReviewPhoto(reviewId));
}
