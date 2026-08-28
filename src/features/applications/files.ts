import type { FileKind } from "@/db/enums";

// What the parent form may upload, per campaign. Kinds differ in WHO MAY SEE
// them (see CLAUDE.md child-data exposure), so the kind is an authorization
// input — never treat these as interchangeable "attachments".
//
//   idp_certificate         → ADMINS ONLY. A state document about a child.
//   letter_photo            → claiming volunteer
//   child_with_letter_photo → claiming volunteer
export const PARENT_UPLOAD_KINDS = [
  "idp_certificate",
  "letter_photo",
  "child_with_letter_photo",
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
