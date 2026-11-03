import { PutObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";

import { canUploadApplicationFile } from "@/features/applications/authz";
import {
  extensionFor,
  MAX_UPLOAD_BYTES,
  rejectUpload,
  type ParentUploadKind,
} from "@/features/applications/files";
import type { FileKind } from "@/db/enums";
import { recordApplicationFile } from "@/features/applications/fileQueries";
import { normalizePhoto } from "@/features/applications/photos";
import { getMyApplication } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";
import {
  deleteStoredObjects,
  fileObjectKey,
  getStorage,
  storageBucket,
} from "@/lib/storage/client";

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
  // A body that won't parse is almost always an upload cut off mid-way — a
  // dropped mobile connection, a closed tab. That's the client's failure, not
  // ours: answer 400 rather than throwing a 500 nobody is there to receive.
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const kind = String(form.get("kind") ?? "");

  // The edit lock covers the form's uploads: once an admin approves, they are
  // frozen. The gift confirmation has its own window — after the claim, which
  // is precisely when the edit lock is on.
  if (!canUploadApplicationFile(actor, application, kind as FileKind)) {
    return NextResponse.json({ error: "not_editable" }, { status: 403 });
  }

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

  // What is stored is never the parent's original: it is re-encoded upright,
  // downscaled, and stripped of metadata — GPS included (see photos.ts). The
  // bytes are also checked to BE an image here, whatever the client declared.
  // And turned by what any text in it says (orientation.ts) — every kind: a
  // parent can photograph the letter in the gift slot, and a photo with no
  // text scores far below the threshold and is left alone.
  const photo = await normalizePhoto(bytes, { detectTurn: true });
  if (!photo.ok) {
    return NextResponse.json(
      { error: photo.reason, maxBytes: MAX_UPLOAD_BYTES },
      { status: 400 },
    );
  }
  if (photo.orientation) {
    // Every decision, for revisiting MIN_ORIENTATION_CONFIDENCE against real
    // uploads: the threshold was set on two photos. The kind and the numbers
    // only — nothing that points at a family.
    console.info("photo orientation", {
      kind,
      turn: photo.orientation.turn,
      confidence: Math.round(photo.orientation.confidence * 10) / 10,
      applied: photo.orientation.applied,
    });
  }

  const storageKey = fileObjectKey(
    applicationId,
    kind,
    extensionFor(photo.contentType),
  );
  await getStorage().send(
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: storageKey,
      Body: photo.bytes,
      ContentType: photo.contentType,
    }),
  );

  const { id, replacedStorageKeys } = await recordApplicationFile({
    applicationId,
    kind: kind as ParentUploadKind,
    storageKey,
    contentType: photo.contentType,
    sizeBytes: photo.bytes.byteLength,
  });
  await deleteStoredObjects(replacedStorageKeys);

  await recordAuditLog({
    actor,
    action: `application.file_uploaded:${kind}`,
    targetType: "application",
    targetId: applicationId,
  });

  return NextResponse.json({
    id,
    kind,
    contentType: photo.contentType,
    sizeBytes: photo.bytes.byteLength,
  });
}
