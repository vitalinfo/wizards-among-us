import { GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import { getPublicReviewPhoto } from "@/features/reviews/queries";
import { isUuid } from "@/lib/uuid";
import { getStorage, storageBucket } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

// The family's photo with the gift, on the public «Відгуки» page.
//
// The ONE file route that needs no session: the parent consented to this photo
// being published on the site (`social_media_consent`), and the page it sits
// on is open to anyone. Everything that makes it publishable is checked in the
// query on every read — the review is published, the application consented,
// the file is a confirmation photo — so unpublishing the review or withdrawing
// the consent takes the photo down on the next request.
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
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const photo = await getPublicReviewPhoto(reviewId);
  if (!photo) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const object = await getStorage().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: photo.storageKey }),
  );
  if (!object.Body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Buffered for the reason the authorized file route gives: an aborted
  // download otherwise throws "Controller is already closed".
  const bytes =
    (await object.Body.transformToByteArray()) as Uint8Array<ArrayBuffer>;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Length": String(photo.sizeBytes),
      // Short and private: a withdrawn consent has to take effect within
      // minutes, so no shared cache may hold a copy, and a browser re-checks
      // after five.
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
    },
  });
}
