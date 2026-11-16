import { getAdminById } from "@/features/admins/adminQueries";
import type { AdminActor } from "@/lib/actor";

import { getApplicationFile, type ApplicationFile } from "./fileQueries";
import { verifyFileLink, type FileLinkKind } from "./fileLinks";
import { getApplicationForFileAccess } from "./queries";

// What a photo link opens, or null — checked against the database on every
// read, because a signature only proves what was true at export time:
// - the file is still there, under that application, of that kind (a replaced
//   photo is a new file, so a link to the old one dies with it);
// - the campaign is still the active one — an archived family's photo does
//   not stay open for the rest of the month;
// - the admin who exported it still has access. Their link is theirs: removed
//   from ADMIN_ALLOWLIST, their spreadsheets stop opening photos.
export async function resolveFileLink(token: string): Promise<{
  file: ApplicationFile;
  kind: FileLinkKind;
  issuedBy: AdminActor;
} | null> {
  const link = await verifyFileLink(token);
  if (!link) {
    return null;
  }

  const [context, file, admin] = await Promise.all([
    getApplicationForFileAccess(link.applicationId),
    getApplicationFile(link.applicationId, link.fileId),
    getAdminById(link.adminId),
  ]);
  if (
    !context?.campaignActive ||
    !file ||
    file.kind !== link.kind ||
    !admin?.hasAccess
  ) {
    return null;
  }

  return {
    file,
    kind: link.kind,
    issuedBy: { kind: "admin", id: admin.id, email: admin.email },
  };
}
