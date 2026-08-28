import { describe, expect, it } from "vitest";

import { isParentUploadKind, MAX_UPLOAD_BYTES, rejectUpload } from "../files";

// Uploads include a child's ВПО certificate, so what may be uploaded — and
// under which kind — is a security boundary, not a convenience check.
describe("rejectUpload", () => {
  const valid = {
    kind: "letter_photo",
    contentType: "image/jpeg",
    sizeBytes: 1024,
  };

  it("accepts a photo of an allowed kind, type and size", () => {
    expect(rejectUpload(valid)).toBeNull();
  });

  it("refuses a kind the parent form doesn't offer", () => {
    // `confirmation` is a real FileKind (Phase 7) but not a parent upload here,
    // and an unknown string must never fall through as an attachment.
    expect(rejectUpload({ ...valid, kind: "confirmation" })).toBe(
      "unknown_kind",
    );
    expect(rejectUpload({ ...valid, kind: "attachment" })).toBe("unknown_kind");
    expect(rejectUpload({ ...valid, kind: "../../etc/passwd" })).toBe(
      "unknown_kind",
    );
  });

  it("refuses anything that isn't an image", () => {
    expect(rejectUpload({ ...valid, contentType: "application/pdf" })).toBe(
      "unsupported_type",
    );
    expect(rejectUpload({ ...valid, contentType: "text/html" })).toBe(
      "unsupported_type",
    );
    expect(rejectUpload({ ...valid, contentType: "" })).toBe(
      "unsupported_type",
    );
  });

  it("refuses an empty or oversized file", () => {
    expect(rejectUpload({ ...valid, sizeBytes: 0 })).toBe("missing_file");
    expect(rejectUpload({ ...valid, sizeBytes: MAX_UPLOAD_BYTES + 1 })).toBe(
      "too_large",
    );
    expect(rejectUpload({ ...valid, sizeBytes: MAX_UPLOAD_BYTES })).toBeNull();
  });
});

describe("isParentUploadKind", () => {
  it("covers exactly the three uploads the real form asks for", () => {
    expect(isParentUploadKind("idp_certificate")).toBe(true);
    expect(isParentUploadKind("letter_photo")).toBe(true);
    expect(isParentUploadKind("child_with_letter_photo")).toBe(true);
    expect(isParentUploadKind("confirmation")).toBe(false);
  });
});
