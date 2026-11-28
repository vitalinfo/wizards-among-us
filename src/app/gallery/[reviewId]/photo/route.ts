import { type NextRequest } from "next/server";

import { getGalleryPhoto } from "@/features/reviews/queries";
import {
  notFound,
  publicPhotoResponse,
} from "@/lib/storage/publicPhotoResponse";
import { isUuid } from "@/lib/uuid";

export const dynamic = "force-dynamic";

// A family's photo with the gift, in the site gallery.
//
// No session, like the «Відгуки» photo route, and for the same reason: the
// parent consented to publication (`social_media_consent`). The query checks
// on every read that the review is in the gallery, the application consented,
// and the file is a confirmation photo — so taking it out of the gallery or
// withdrawing the consent takes it down on the next request. Not audit-logged
// per read; the decision is — `review.added_to_gallery`.
//
// Under /gallery, so robots.txt's `Disallow: /gallery` keeps these photos of
// children out of image search.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  if (!isUuid(reviewId)) {
    return notFound();
  }
  return publicPhotoResponse(await getGalleryPhoto(reviewId));
}
