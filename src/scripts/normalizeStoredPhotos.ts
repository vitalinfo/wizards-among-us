import { existsSync, readFileSync } from "node:fs";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { asc, inArray } from "drizzle-orm";
import sharp from "sharp";

import { getDb } from "@/db";
import { applicationFiles } from "@/db/schema";
import { replaceApplicationFileObject } from "@/features/applications/fileQueries";
import { extensionFor } from "@/features/applications/files";
import { normalizePhoto } from "@/features/applications/photos";
import {
  decideStoredPhoto,
  type StoredPhotoFacts,
} from "@/features/applications/storedPhotos";
import {
  deleteStoredObjects,
  fileObjectKey,
  getStorage,
  storageBucket,
} from "@/lib/storage/client";

// One-off: bring photos stored BEFORE uploads were normalized up to what an
// upload produces today — turned upright by its EXIF tag, at most
// 2560px, a JPEG with no metadata. That last part is the one that matters
// most: phone originals carry GPS, and the letter photo is on the browse card.
//
// Three steps, deliberately separate, because the last one cannot be undone:
//
//   pnpm photos:normalize                  dry run — reads everything, changes
//                                          nothing, prints what it would do
//   pnpm photos:normalize --apply          writes each new photo to a NEW key
//                                          and moves its row there (guarded on
//                                          the old key, like the rotate route);
//                                          the originals stay, and their keys
//                                          are saved to a list it names
//   pnpm photos:normalize --delete-originals <that list>
//                                          once the photos have been looked
//                                          at: deletes the originals — only
//                                          those no row points at any more
//
// Add `--only <file id>` to any of the first two to work on one photo.
//
// Run from a checkout, not on a dyno: it needs tsx, a dev dependency Heroku
// prunes (and that stays a dev dependency). To target another environment,
// pass that app's DATABASE_URL and S3_* for the one command (README,
// "Uploaded photos"). Anything left unset falls back to .env.local, so pass
// ALL of them or none — half staging, half dev is how a run would write dev
// objects for staging rows. It prints the database host and bucket before
// touching anything.
//
// The originals list lives in the target's BUCKET (under ORIGINALS_PREFIX),
// not on the machine that ran it: it belongs to that environment, and step
// three can then only ever be fed a list from the bucket it deletes from.
//
// Not audit-logged: audit_logs has no actor for "a script", and no person's
// view of a child's data is involved. The output names files by the first 8
// characters of their id, never by storage key (it carries the application
// id) — the keys go only into the originals list.
loadEnvConfig(process.cwd());

const ORIGINALS_PREFIX = "maintenance/photo-originals/";

async function main() {
  printTarget();
  const args = process.argv.slice(2);
  const deleteIndex = args.indexOf("--delete-originals");
  if (deleteIndex !== -1) {
    const list = args[deleteIndex + 1];
    if (!list?.startsWith(ORIGINALS_PREFIX) && !(list && existsSync(list))) {
      throw new Error(
        `--delete-originals needs the list --apply named (${ORIGINALS_PREFIX}…, or a local file from an earlier run)`,
      );
    }
    await deleteOriginals(list);
    return;
  }
  // `--only <id>`: one file (an id or its first characters, as printed) —
  // to try a single photo on an environment before all of them.
  const onlyIndex = args.indexOf("--only");
  const only = onlyIndex === -1 ? undefined : args[onlyIndex + 1];
  if (onlyIndex !== -1 && !only) {
    throw new Error("--only needs a file id");
  }
  await normalizeAll(args.includes("--apply"), only);
}

async function normalizeAll(apply: boolean, only: string | undefined) {
  const all = await getDb()
    .select({
      id: applicationFiles.id,
      applicationId: applicationFiles.applicationId,
      kind: applicationFiles.kind,
      storageKey: applicationFiles.storageKey,
    })
    .from(applicationFiles)
    .orderBy(asc(applicationFiles.createdAt));
  const rows = only ? all.filter((row) => row.id.startsWith(only)) : all;

  console.log(
    `${apply ? "APPLYING" : "DRY RUN — nothing will change"}: ${rows.length} stored photos\n`,
  );

  const originals: string[] = [];
  const counts = { rewrite: 0, already_normalized: 0, failed: 0, conflict: 0 };

  // Saved however the loop ends: if the run dies halfway, the originals
  // already replaced still have to be findable.
  try {
    for (const [index, row] of rows.entries()) {
      const label = `${String(index + 1).padStart(3)}/${rows.length} ${row.id.slice(0, 8)} ${row.kind.padEnd(23)}`;
      try {
        const object = await getStorage().send(
          new GetObjectCommand({
            Bucket: storageBucket(),
            Key: row.storageKey,
          }),
        );
        if (!object.Body) {
          throw new Error("object has no body");
        }
        const bytes = await object.Body.transformToByteArray();
        const before = await factsOf(bytes);

        const photo = await normalizePhoto(bytes);
        if (!photo.ok) {
          // A HEIC from before HEIC was refused lands here: sharp cannot read it.
          counts.failed += 1;
          console.log(
            `${label} ${describe(before, bytes)}  FAILED: ${photo.reason}`,
          );
          continue;
        }

        const decision = before ? decideStoredPhoto(before) : "rewrite";
        if (decision === "already_normalized") {
          counts.already_normalized += 1;
          console.log(`${label} ${describe(before, bytes)}  ok as is`);
          continue;
        }

        const after = await factsOf(photo.bytes);
        console.log(
          `${label} ${describe(before, bytes)}  → ${describe(after, photo.bytes)}`,
        );
        counts.rewrite += 1;
        if (!apply) {
          continue;
        }

        const storageKey = fileObjectKey(
          row.applicationId,
          row.kind,
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
          row.applicationId,
          row.id,
          row.storageKey,
          {
            storageKey,
            contentType: photo.contentType,
            sizeBytes: photo.bytes.byteLength,
          },
        );
        if (!moved) {
          // Turned, replaced or deleted while this ran: the row no longer
          // points at what was read, so this result must not win.
          await deleteStoredObjects([storageKey]);
          counts.rewrite -= 1;
          counts.conflict += 1;
          console.log(`${label} changed while running — left as it is now`);
          continue;
        }
        originals.push(row.storageKey);
      } catch (error) {
        counts.failed += 1;
        console.log(
          `${label} FAILED: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    if (originals.length > 0) {
      await saveOriginals(originals);
    }
  }

  console.log(
    `\n${apply ? "Rewritten" : "Would rewrite"}: ${counts.rewrite} · already normalized: ${counts.already_normalized} · failed: ${counts.failed}${counts.conflict ? ` · changed while running: ${counts.conflict}` : ""}`,
  );
}

async function saveOriginals(keys: string[]) {
  const list = `${ORIGINALS_PREFIX}${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  await getStorage().send(
    new PutObjectCommand({
      Bucket: storageBucket(),
      Key: list,
      Body: `${keys.join("\n")}\n`,
      ContentType: "text/plain; charset=utf-8",
    }),
  );
  console.log(
    `\nThe ${keys.length} originals are still in the bucket (with their GPS).` +
      `\nLook at the photos, then remove them with:` +
      `\n  pnpm photos:normalize --delete-originals ${list}`,
  );
}

async function deleteOriginals(list: string) {
  // In the bucket since the list moved there; a local file is what the first
  // version of this script wrote (it is how the dev originals were listed).
  const inBucket = list.startsWith(ORIGINALS_PREFIX);
  const text = inBucket
    ? ((await (
        await getStorage().send(
          new GetObjectCommand({ Bucket: storageBucket(), Key: list }),
        )
      ).Body?.transformToString()) ?? "")
    : readFileSync(list, "utf8");
  const keys = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    console.log("Nothing listed.");
    return;
  }
  // Never delete an object a row still points at — the list could be stale.
  const stillUsed = new Set(
    (
      await getDb()
        .select({ storageKey: applicationFiles.storageKey })
        .from(applicationFiles)
        .where(inArray(applicationFiles.storageKey, keys))
    ).map((row) => row.storageKey),
  );
  const orphaned = keys.filter((key) => !stillUsed.has(key));
  await deleteStoredObjects(orphaned);
  if (inBucket && stillUsed.size === 0) {
    // Done with: it named objects that no longer exist.
    await deleteStoredObjects([list]);
  }
  console.log(
    `Deleted ${orphaned.length} originals.${stillUsed.size ? ` Kept ${stillUsed.size} that a row still uses, and the list.` : ""}`,
  );
}

// Which database and bucket this run is about to touch — the host only, never
// a credential — so a wrong environment is visible before anything happens.
function printTarget() {
  const database = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).host
    : "(DATABASE_URL not set)";
  console.log(
    `database: ${database}\nbucket:   ${process.env.S3_BUCKET ?? "(S3_BUCKET not set)"} at ${process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).host : "(S3_ENDPOINT not set)"}\n`,
  );
}

async function factsOf(bytes: Uint8Array): Promise<StoredPhotoFacts | null> {
  try {
    const m = await sharp(bytes, { limitInputPixels: false }).metadata();
    return {
      format: m.format,
      width: m.width ?? 0,
      height: m.height ?? 0,
      hasMetadata: Boolean(m.exif || m.icc || m.xmp || m.iptc),
    };
  } catch {
    return null;
  }
}

function describe(facts: StoredPhotoFacts | null, bytes: Uint8Array): string {
  const size = `${Math.round(bytes.byteLength / 1024)}KB`;
  if (!facts) {
    return `unreadable ${size}`;
  }
  return `${facts.format} ${facts.width}×${facts.height} ${size}${facts.hasMetadata ? " +metadata" : ""}`;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
