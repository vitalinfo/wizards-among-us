import type { ActorType } from "@/db/enums";
import { getAdminById } from "@/features/admins/adminQueries";
import type { AuditQuery } from "@/features/audit/listQuery";
import { getUserForAdmin } from "@/features/users/adminQueries";

export type AuditExportSubject = { type: ActorType; id: string };

// Whose log a view can be exported as: the one admin or user its ?actor=
// names, or nobody. The page (whether to offer the button) and the export
// route (whether to answer) both ask this, so they cannot disagree.
//
// Always ONE actor, never the whole trail: the trail is every volunteer's IP
// address beside every child they opened. One person's slice of it is what an
// investigation of that person needs, and the download is itself logged.
export async function findAuditExportSubject(
  query: Pick<AuditQuery, "actorType" | "actorId">,
): Promise<AuditExportSubject | null> {
  if (!query.actorId) {
    return null;
  }
  const subject = await findActor(query.actorId);
  // A type that is not the actor's matches no row — nothing to export.
  if (!subject || (query.actorType && query.actorType !== subject.type)) {
    return null;
  }
  return subject;
}

// An id names an admin or a user, never both — two tables, random uuids.
async function findActor(id: string): Promise<AuditExportSubject | null> {
  if (await getAdminById(id)) {
    return { type: "admin", id };
  }
  if (await getUserForAdmin(id)) {
    return { type: "user", id };
  }
  return null;
}
