import { describe, expect, it } from "vitest";

import { galleryOrderSeed, galleryPhotoHref, GALLERY_SIZE } from "../gallery";
import { reviewsOrderSeed } from "../publicQuery";

describe("galleryOrderSeed", () => {
  it("holds for the whole hour and changes with the next", () => {
    const start = new Date("2026-11-28T10:00:00Z");
    const end = new Date("2026-11-28T10:59:59.999Z");
    const next = new Date("2026-11-28T11:00:00Z");

    expect(galleryOrderSeed(end)).toBe(galleryOrderSeed(start));
    expect(galleryOrderSeed(next)).not.toBe(galleryOrderSeed(start));
  });

  // Same hour, different shuffle: otherwise the gallery's first photos would
  // be the reviews page's first reviews.
  it("differs from the reviews page's seed in the same hour", () => {
    const now = new Date("2026-11-28T10:30:00Z");
    expect(galleryOrderSeed(now)).not.toBe(reviewsOrderSeed(now));
  });
});

describe("galleryPhotoHref", () => {
  it("points at the gallery's public photo route, versioned", () => {
    expect(
      galleryPhotoHref({
        reviewId: "0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10",
        version: 42,
      }),
    ).toBe("/gallery/0c9e5c55-6a3f-4a86-9a0e-4f1d2f6b7a10/photo?v=42");
  });
});

describe("GALLERY_SIZE", () => {
  it("is the 20 asked for", () => {
    expect(GALLERY_SIZE).toBe(20);
  });
});
