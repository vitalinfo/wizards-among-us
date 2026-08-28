import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import {
  canEditApplication,
  canViewApplicationFile,
} from "@/features/applications/authz";
import {
  deleteApplicationFile,
  getApplicationFile,
} from "@/features/applications/fileQueries";
import { getApplicationForFileAccess } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getSessionActor } from "@/lib/auth/session";
import { getStorage, storageBucket } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

// Reads stream THROUGH this route rather than redirecting to a signed URL.
// A signed URL can be forwarded and replayed until it expires; proxying means
// the authorization check runs on every single read and every read is logged —
// which the child-data invariant requires.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; fileId: string }> },
) {
  const { applicationId, fileId } = await params;
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await getApplicationForFileAccess(applicationId);
  const file = await getApplicationFile(applicationId, fileId);
  if (!context || !file) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // The KIND decides the audience: the ВПО certificate is admin/parent only,
  // never a volunteer — not even the one holding the claim.
  if (
    !canViewApplicationFile(
      actor,
      context.application,
      context.claim,
      file.kind,
    )
  ) {
    // 404, not 403: a volunteer probing for a certificate shouldn't learn that
    // one exists.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const object = await getStorage().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: file.storageKey }),
  );
  if (!object.Body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordAuditLog({
    actor,
    action: `application.file_viewed:${file.kind}`,
    targetType: "application",
    targetId: applicationId,
  });

  return new NextResponse(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.sizeBytes),
      // Private: never cached by a proxy or CDN, and re-fetched (and so
      // re-authorized) rather than served from a shared cache.
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  });
}

// Replacing a photo: the parent removes the old one first. Allowed only while
// the application is still editable.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; fileId: string }> },
) {
  const { applicationId, fileId } = await params;
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await getApplicationForFileAccess(applicationId);
  if (!context || !canEditApplication(actor, context.application)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const removed = await deleteApplicationFile(applicationId, fileId);
  if (!removed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Row first, then the object: if this fails we have an orphaned object, which
  // is inert and cleanable. The reverse would leave a row pointing at nothing.
  await getStorage().send(
    new DeleteObjectCommand({
      Bucket: storageBucket(),
      Key: removed.storageKey,
    }),
  );

  await recordAuditLog({
    actor,
    action: `application.file_deleted:${removed.kind}`,
    targetType: "application",
    targetId: applicationId,
  });

  return NextResponse.json({ ok: true });
}
