import { GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import { resolveFileLink } from "@/features/applications/fileLinkQueries";
import { recordAuditLog } from "@/features/audit/log";
import { getStorage, storageBucket } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

// The photo behind a signed link (features/applications/fileLinks.ts). No
// session: the token is the authorization, re-checked against the database on
// every read and logged against the admin whose export it came from.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const resolved = await resolveFileLink(token);
  if (!resolved) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { file, issuedBy } = resolved;

  const object = await getStorage().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: file.storageKey }),
  );
  if (!object.Body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditLog({
    actor: issuedBy,
    action: `application.file_viewed_via_link:${file.kind}`,
    targetType: "application",
    targetId: file.applicationId,
  });

  // Buffered, as the session route does it (see
  // api/applications/[applicationId]/files/[fileId]/route.ts for why).
  const bytes =
    (await object.Body.transformToByteArray()) as Uint8Array<ArrayBuffer>;

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
