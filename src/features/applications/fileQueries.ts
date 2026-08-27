import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import type { FileKind } from "@/db/enums";
import { applicationFiles } from "@/db/schema";

export type ApplicationFile = typeof applicationFiles.$inferSelect;

export async function listApplicationFiles(
  applicationId: string,
): Promise<ApplicationFile[]> {
  return getDb()
    .select()
    .from(applicationFiles)
    .where(eq(applicationFiles.applicationId, applicationId));
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
