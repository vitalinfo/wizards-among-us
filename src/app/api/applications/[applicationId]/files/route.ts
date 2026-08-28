import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import { canEditApplication } from "@/features/applications/authz";
import {
  extensionFor,
  MAX_UPLOAD_BYTES,
  rejectUpload,
  type ParentUploadKind,
} from "@/features/applications/files";
import { recordApplicationFile } from "@/features/applications/fileQueries";
import { getMyApplication } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";
import { fileObjectKey, getStorage, storageBucket } from "@/lib/storage/client";

export const dynamic = "force-dynamic";

// Parent upload. A route handler rather than a server action because those cap
// the request body at ~1 MB by default, and these are phone photos.
//
// The file goes THROUGH the server on purpose (not a presigned PUT straight to
// R2): it lets us validate the bytes we actually received instead of trusting a
// client-declared size and content type, and it keeps every object unreachable
// without an authorization check.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const application = await getMyApplication(applicationId, actor.id);
  // Same 404 for "not yours" and "doesn't exist" — a probe must not confirm
  // that someone else's application exists.
  if (!application) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // The edit lock covers uploads too: once an admin approves, files are frozen.
  if (!canEditApplication(actor, application)) {
    return NextResponse.json({ error: "not_editable" }, { status: 403 });
  }

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const rejection = rejectUpload({
    kind,
    contentType: file.type,
    // The REAL byte length, not file.size — which is client-reported.
    sizeBytes: bytes.byteLength,
  });
  if (rejection) {
    return NextResponse.json(
      { error: rejection, maxBytes: MAX_UPLOAD_BYTES },
      { status: 400 },
    );
  }

  const storageKey = fileObjectKey(
    applicationId,
    kind,
    extensionFor(file.type),
  );
  await getStorage().send(
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: storageKey,
      Body: bytes,
      ContentType: file.type,
    }),
  );

  const id = await recordApplicationFile({
    applicationId,
    kind: kind as ParentUploadKind,
    storageKey,
    contentType: file.type,
    sizeBytes: bytes.byteLength,
  });

  await recordAuditLog({
    actor,
    action: `application.file_uploaded:${kind}`,
    targetType: "application",
    targetId: applicationId,
  });

  return NextResponse.json({
    id,
    kind,
    contentType: file.type,
    sizeBytes: bytes.byteLength,
  });
}
