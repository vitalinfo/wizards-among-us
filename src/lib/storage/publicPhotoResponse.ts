import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { getStorage, storageBucket } from "@/lib/storage/client";

// The response for a family photo on a public page — «Відгуки» and the
// gallery, the two file routes that need no session. The caller has already
// decided the photo is publishable (its query checks consent on every read);
// null, or an object storage has lost, is a 404.
export async function publicPhotoResponse(
  photo: { storageKey: string; contentType: string; sizeBytes: number } | null,
): Promise<NextResponse> {
  if (!photo) {
    return notFound();
  }

  const object = await getStorage().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: photo.storageKey }),
  );
  if (!object.Body) {
    return notFound();
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

export function notFound(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}
