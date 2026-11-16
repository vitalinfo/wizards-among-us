import { SignJWT, jwtVerify } from "jose";

import { isUuid } from "@/lib/uuid";

// A photo link that opens WITHOUT a session — for the queue export, whose
// readers are coordinators with no account (Vital, Nov 2026). The spreadsheet
// already carries the family's town, delivery information and contact, so the
// link gives its holder no one they could not already reach; it gives them the
// two photos as well.
//
// A bearer link can be forwarded, so it is narrowed every way it can be:
// - one token per FILE, for 30 days;
// - only the two photos. Never the ВПО certificate: the kind is checked here on
//   the way in, not only trusted from the code that signs;
// - its own secret. Rotating FILE_LINK_SECRET kills every outstanding link
//   without signing anyone out — the only revocation a JWT has;
// - re-checked on every read (fileLinkQueries.ts) and audit-logged against the
//   admin who exported it.

export const FILE_LINK_KINDS = [
  "letter_photo",
  "child_with_letter_photo",
] as const;

export type FileLinkKind = (typeof FILE_LINK_KINDS)[number];

export function isFileLinkKind(kind: string): kind is FileLinkKind {
  return (FILE_LINK_KINDS as readonly string[]).includes(kind);
}

export const FILE_LINK_TTL_SECONDS = 30 * 24 * 60 * 60;

// Keeps a token signed for something else from ever reading as a file link.
const AUDIENCE = "file-link";

export type FileLink = {
  applicationId: string;
  fileId: string;
  kind: FileLinkKind;
  // Who exported it: the reads are logged against them.
  adminId: string;
};

function secret(): Uint8Array {
  const value = process.env.FILE_LINK_SECRET;
  if (!value || value.length < 32) {
    throw new Error("FILE_LINK_SECRET is not set (32+ characters)");
  }
  return new TextEncoder().encode(value);
}

export async function signFileLink(
  link: FileLink,
  now: Date = new Date(),
): Promise<string> {
  if (!isFileLinkKind(link.kind)) {
    throw new Error(`not a linkable file kind: ${link.kind}`);
  }
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({
    app: link.applicationId,
    kind: link.kind,
    adm: link.adminId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(link.fileId)
    .setAudience(AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + FILE_LINK_TTL_SECONDS)
    .sign(secret());
}

// The link, or null for anything that is not a valid, unexpired one. A missing
// secret throws instead: every link answering 404 would hide a broken deploy.
export async function verifyFileLink(
  token: string,
  now: Date = new Date(),
): Promise<FileLink | null> {
  const key = secret();
  let payload;
  try {
    ({ payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      audience: AUDIENCE,
      currentDate: now,
      requiredClaims: ["exp", "sub"],
    }));
  } catch {
    return null;
  }
  const { sub, app, kind, adm } = payload;
  if (
    typeof sub !== "string" ||
    typeof app !== "string" ||
    typeof adm !== "string" ||
    typeof kind !== "string" ||
    !isUuid(sub) ||
    !isUuid(app) ||
    !isUuid(adm) ||
    !isFileLinkKind(kind)
  ) {
    return null;
  }
  return { applicationId: app, fileId: sub, kind, adminId: adm };
}
