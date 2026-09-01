import { describe, expect, it } from "vitest";

import {
  CLAIM_VISIBLE_KINDS,
  isParentUploadKind,
  latestByKind,
  MAX_UPLOAD_BYTES,
  rejectUpload,
} from "../files";

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

describe("CLAIM_VISIBLE_KINDS", () => {
  // The one kind that must never reach a volunteer. This list decides what the
  // claims page ASKS for; canViewApplicationFile is what enforces it, but a
  // page that asks for the certificate would be a 404 loop at best and the
  // start of a leak at worst.
  it("excludes the ВПО certificate", () => {
    expect(CLAIM_VISIBLE_KINDS).not.toContain("idp_certificate");
  });
});

describe("latestByKind", () => {
  const files = [
    { id: "old-letter", kind: "letter_photo" },
    { id: "cert", kind: "idp_certificate" },
    { id: "new-letter", kind: "letter_photo" },
    { id: "child", kind: "child_with_letter_photo" },
  ];

  // Nothing stops a parent uploading twice without removing the first, and the
  // newest is the one they meant — a family retaking a photo must not leave the
  // volunteer looking at the discarded one.
  it("takes the newest of each kind", () => {
    expect(latestByKind(files, ["letter_photo"])).toEqual([
      { id: "new-letter", kind: "letter_photo" },
    ]);
  });

  it("returns them in the order asked for, skipping what is absent", () => {
    expect(latestByKind(files, CLAIM_VISIBLE_KINDS).map((f) => f.id)).toEqual([
      "new-letter",
      "child",
    ]);
  });

  it("returns only the kinds asked for", () => {
    expect(
      latestByKind(files, CLAIM_VISIBLE_KINDS).map((f) => f.kind),
    ).not.toContain("idp_certificate");
  });
});
