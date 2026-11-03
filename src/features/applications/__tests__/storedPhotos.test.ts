import { describe, expect, it } from "vitest";

import { MAX_PHOTO_SIDE } from "../photos";
import { decideStoredPhoto } from "../storedPhotos";

// The backfill rewrites a production object for every "rewrite", so both
// directions of this rule matter: a phone original must never be left with
// its GPS, and a clean photo must not lose quality to a pointless re-encode.
describe("decideStoredPhoto", () => {
  const clean = {
    format: "jpeg",
    width: 1920,
    height: MAX_PHOTO_SIDE,
    hasMetadata: false,
  };

  it("leaves a photo that is already what an upload produces today", () => {
    expect(decideStoredPhoto(clean)).toBe("already_normalized");
  });

  it("rewrites anything that still carries metadata — GPS lives there", () => {
    expect(decideStoredPhoto({ ...clean, hasMetadata: true })).toBe("rewrite");
  });

  it("rewrites a photo larger than the limit", () => {
    expect(decideStoredPhoto({ ...clean, width: MAX_PHOTO_SIDE + 1 })).toBe(
      "rewrite",
    );
  });

  it("rewrites a PNG or WebP into the one stored format", () => {
    for (const format of ["png", "webp"]) {
      expect(decideStoredPhoto({ ...clean, format })).toBe("rewrite");
    }
  });
});
