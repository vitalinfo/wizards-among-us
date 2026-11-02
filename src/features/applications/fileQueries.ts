import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { FileKind } from "@/db/enums";
import { applicationFiles, applications } from "@/db/schema";

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

// Every upload slot holds ONE file, so recording a file of a kind replaces
// whatever of that kind was there — «Замінити» is just another upload, and
// before this each one added a row (the admin page, which lists every row,
// showed all of them). Returns the replaced keys: their objects are the
// caller's to remove, because storage is not in this transaction.
//
// The application row is locked first so two uploads of the same kind (two
// tabs) take turns: without it both could delete nothing and both insert.
export async function recordApplicationFile(file: {
  applicationId: string;
  kind: FileKind;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
}): Promise<{ id: string; replacedStorageKeys: string[] }> {
  return getDb().transaction(async (tx) => {
    await tx
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.id, file.applicationId))
      .for("update");

    const replaced = await tx
      .delete(applicationFiles)
      .where(
        and(
          eq(applicationFiles.applicationId, file.applicationId),
          eq(applicationFiles.kind, file.kind),
        ),
      )
      .returning({ storageKey: applicationFiles.storageKey });
    const [row] = await tx
      .insert(applicationFiles)
      .values(file)
      .returning({ id: applicationFiles.id });

    return {
      id: row.id,
      replacedStorageKeys: replaced.map((r) => r.storageKey),
    };
  });
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
