import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { canRotateApplicationFile } from "@/features/applications/authz";
import {
  getApplicationFile,
  replaceApplicationFileObject,
} from "@/features/applications/fileQueries";
import { extensionFor } from "@/features/applications/files";
import { normalizePhoto } from "@/features/applications/photos";
import { getApplicationForFileAccess } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getSessionActor } from "@/lib/auth/session";
import {
  deleteStoredObjects,
  fileObjectKey,
  getStorage,
  storageBucket,
} from "@/lib/storage/client";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ direction: z.enum(["left", "right"]) });

// Turns a stored photo a quarter turn. The pixels are rewritten — not a
// rotation remembered somewhere and applied on every read — so the photo is
// upright for every viewer, in a download and in a new tab alike, and no
// migration is needed.
//
// Each turn re-encodes the JPEG. At quality 85 the loss after a few turns is
// not visible on a photo of a document; a lossless turn would need a jpegtran
// binary on the dyno, which sharp does not ship.
//
// Written to a NEW key, then the row is moved to it, then the old object goes:
// a failure at any step leaves the row pointing at a complete photo, never at
// a half-written one.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string; fileId: string }> },
) {
  const { applicationId, fileId } = await params;
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const context = await getApplicationForFileAccess(applicationId);
  const file = await getApplicationFile(applicationId, fileId);
  // 404 for "not allowed" too, as on the read route: a volunteer probing must
  // not learn which files exist.
  if (
    !context ||
    !file ||
    !canRotateApplicationFile(actor, context.application, file.kind)
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const object = await getStorage().send(
    new GetObjectCommand({ Bucket: storageBucket(), Key: file.storageKey }),
  );
  if (!object.Body) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const original = await object.Body.transformToByteArray();

  // Through the same pipeline as an upload, so a photo stored before it
  // existed (EXIF tag, full size, GPS) comes out normalized on its first turn.
  // A HEIC from back then cannot be decoded and is refused here.
  const photo = await normalizePhoto(original, {
    turn: parsed.data.direction,
  });
  if (!photo.ok) {
    return NextResponse.json({ error: photo.reason }, { status: 422 });
  }

  const storageKey = fileObjectKey(
    applicationId,
    file.kind,
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

  const moved = await replaceApplicationFileObject(
    applicationId,
    fileId,
    file.storageKey,
    {
      storageKey,
      contentType: photo.contentType,
      sizeBytes: photo.bytes.byteLength,
    },
  );
  if (!moved) {
    // Another turn (or a delete) got there first. Ours was made from a photo
    // that is no longer the current one, so it must not win.
    await deleteStoredObjects([storageKey]);
    return NextResponse.json({ error: "conflict" }, { status: 409 });
  }
  await deleteStoredObjects([file.storageKey]);

  await recordAuditLog({
    actor,
    action: `application.file_rotated:${file.kind}`,
    targetType: "application",
    targetId: applicationId,
  });

  return NextResponse.json({ ok: true });
}
