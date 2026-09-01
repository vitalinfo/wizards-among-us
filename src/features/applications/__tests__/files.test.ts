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

  it("refuses a kind the parent never uploads", () => {
    // An unknown string must never fall through as an attachment. (This used to
    // include `confirmation`; Phase 7 made it a real parent upload — with a
    // different WINDOW, enforced by canUploadApplicationFile, not here.)
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
  it("covers the three form uploads plus the gift confirmation", () => {
    expect(isParentUploadKind("idp_certificate")).toBe(true);
    expect(isParentUploadKind("letter_photo")).toBe(true);
    expect(isParentUploadKind("child_with_letter_photo")).toBe(true);
    // Phase 7: uploaded by the parent too, just much later in the flow.
    expect(isParentUploadKind("confirmation")).toBe(true);
  });
});

// The confirmation photo is a parent upload like the others, but its WINDOW is
// the opposite of theirs — see canUploadApplicationFile.
describe("confirmation as an upload kind", () => {
  it("is accepted by the upload validator", () => {
    expect(
      rejectUpload({
        kind: "confirmation",
        contentType: "image/jpeg",
        sizeBytes: 1024,
      }),
    ).toBeNull();
  });

  it("still obeys the type and size rules", () => {
    expect(
      rejectUpload({
        kind: "confirmation",
        contentType: "application/pdf",
        sizeBytes: 1024,
      }),
    ).toBe("unsupported_type");
    expect(
      rejectUpload({
        kind: "confirmation",
        contentType: "image/jpeg",
        sizeBytes: MAX_UPLOAD_BYTES + 1,
      }),
    ).toBe("too_large");
  });
});
