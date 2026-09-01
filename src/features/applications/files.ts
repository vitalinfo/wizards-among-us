import type { CampaignType, FileKind } from "@/db/enums";

// What the parent form may upload, per campaign. Kinds differ in WHO MAY SEE
// them (see CLAUDE.md child-data exposure), so the kind is an authorization
// input — never treat these as interchangeable "attachments".
//
//   idp_certificate         → ADMINS ONLY. A state document about a child.
//   letter_photo            → claiming volunteer
//   child_with_letter_photo → claiming volunteer
//   confirmation            → claiming volunteer (proof the gift arrived)
//
// They also differ in WHEN they may be uploaded, which this list does not
// express: the three form kinds belong to a draft the parent is still editing,
// while `confirmation` is uploaded AFTER approval has locked everything else.
// That timing lives in canUploadApplicationFile — see applications/authz.ts.
export const PARENT_UPLOAD_KINDS = [
  "idp_certificate",
  "letter_photo",
  "child_with_letter_photo",
  "confirmation",
] as const satisfies readonly FileKind[];

export type ParentUploadKind = (typeof PARENT_UPLOAD_KINDS)[number];

export function isParentUploadKind(value: string): value is ParentUploadKind {
  return (PARENT_UPLOAD_KINDS as readonly string[]).includes(value);
}

// Phone cameras produce large JPEGs; 10 MB covers a photo of a document without
// letting someone park a video in the bucket. Enforced against the ACTUAL bytes
// received, never a client-declared size.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Images only. Deliberately no PDF: every one of these is a photograph in the
// real process, and narrowing the type narrows what can be uploaded at all.
export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

export function isAllowedUploadType(contentType: string): boolean {
  return (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(contentType);
}

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? "";
}

// Why an upload was refused. Returned as a code so the UI supplies the
// Ukrainian copy (same pattern as SubmitBlockReason).
export type UploadRejection =
  | "not_editable"
  | "unknown_kind"
  | "unsupported_type"
  | "too_large"
  | "missing_file";

export function rejectUpload(input: {
  kind: string;
  contentType: string;
  sizeBytes: number;
}): UploadRejection | null {
  if (!isParentUploadKind(input.kind)) {
    return "unknown_kind";
  }
  if (!isAllowedUploadType(input.contentType)) {
    return "unsupported_type";
  }
  if (input.sizeBytes <= 0) {
    return "missing_file";
  }
  if (input.sizeBytes > MAX_UPLOAD_BYTES) {
    return "too_large";
  }
  return null;
}

// Uploads a campaign REQUIRES before an application may be submitted.
//
// The form already marks these `required`, but that is a browser hint on a
// styled label — it cannot block a submit, and a server action is a public
// endpoint. Without this the UI promised something nothing enforced, and an
// application could arrive with no ВПО certificate and no photo of the letter,
// which is most of what an admin reviews.
//
// Per campaign type, like TYPE_FIELDS_SCHEMAS: a future type may ask for
// different documents, or none.
export const REQUIRED_UPLOADS: Record<CampaignType, readonly FileKind[]> = {
  saint_nicholas_day: [
    "idp_certificate",
    "letter_photo",
    "child_with_letter_photo",
  ],
  new_school_year: [],
};

// Which required uploads are still missing, in the order the form asks for
// them — so the message can name them rather than just refusing.
export function missingUploads(
  campaignType: CampaignType,
  present: readonly FileKind[],
): readonly FileKind[] {
  const have = new Set(present);
  return REQUIRED_UPLOADS[campaignType].filter((kind) => !have.has(kind));
}
