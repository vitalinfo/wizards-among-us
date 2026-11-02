import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { FileKind } from "@/db/enums";
import { applicationFiles } from "@/db/schema";

export type ApplicationFile = typeof applicationFiles.$inferSelect;

// Ordered OLDEST FIRST, deliberately. Each upload slot is single-file in the
// UI, but nothing in the schema stops a parent ending up with two of a kind
// (upload, then upload again without removing the first). Unordered, which one
// a caller displayed was whatever Postgres happened to return — a parent could
// retake their confirmation photo and have the volunteer shown the discarded
// one. With a stable order, "the newest of this kind" is the LAST match, which
// is what every caller wants.
export async function listApplicationFiles(
  applicationId: string,
): Promise<ApplicationFile[]> {
  return getDb()
    .select()
    .from(applicationFiles)
    .where(eq(applicationFiles.applicationId, applicationId))
    .orderBy(asc(applicationFiles.createdAt), asc(applicationFiles.id));
}

// Scoped by applicationId as well as id, so a file id from one application can
// never be read through another application's route.
export async function getApplicationFile(
  applicationId: string,
  fileId: string,
): Promise<ApplicationFile | null> {
  const [row] = await getDb()
    .select()
    .from(applicationFiles)
    .where(
      and(
        eq(applicationFiles.id, fileId),
        eq(applicationFiles.applicationId, applicationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function recordApplicationFile(file: {
  applicationId: string;
  kind: FileKind;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
}): Promise<string> {
  const [row] = await getDb()
    .insert(applicationFiles)
    .values(file)
    .returning({ id: applicationFiles.id });
  return row.id;
}

// Points a file row at a new stored object (a turned photo). Guarded on the
// key the caller READ: two turns racing each other would otherwise both land,
// and the photo would end up turned once instead of twice. The loser gets
// `false` and must remove the object it wrote.
export async function replaceApplicationFileObject(
  applicationId: string,
  fileId: string,
  expectedStorageKey: string,
  next: { storageKey: string; contentType: string; sizeBytes: number },
): Promise<boolean> {
  const rows = await getDb()
    .update(applicationFiles)
    .set(next)
    .where(
      and(
        eq(applicationFiles.id, fileId),
        eq(applicationFiles.applicationId, applicationId),
        eq(applicationFiles.storageKey, expectedStorageKey),
      ),
    )
    .returning({ id: applicationFiles.id });
  return rows.length > 0;
}

export async function deleteApplicationFile(
  applicationId: string,
  fileId: string,
): Promise<ApplicationFile | null> {
  const [row] = await getDb()
    .delete(applicationFiles)
    .where(
      and(
        eq(applicationFiles.id, fileId),
        eq(applicationFiles.applicationId, applicationId),
      ),
    )
    .returning();
  return row ?? null;
}
